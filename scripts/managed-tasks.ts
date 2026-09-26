import { Listr, type ListrTask } from "listr2";
import { spawn } from "node:child_process";
import {
  createWriteStream,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { finished } from "node:stream/promises";

import { plans, type TaskGroup } from "./task-plans";

const scriptName = process.argv[2];
if (scriptName === undefined || plans[scriptName] === undefined) {
  throw new Error(`Unknown managed script: ${scriptName ?? "<missing>"}`);
}

const sanitizeFileName = (value: string): string =>
  value.replaceAll(/[^a-zA-Z0-9._-]+/g, "-").replaceAll(/^-|-$/g, "");

const SCRIPT_OUTPUT_DIRECTORY = path.resolve("temp", "scripts");
const OUTPUT_RETENTION_MS = 24 * 60 * 60 * 1000;

const removeExpiredOutputLogs = (): void => {
  const expirationTime = Date.now() - OUTPUT_RETENTION_MS;
  const entries = readdirSync(SCRIPT_OUTPUT_DIRECTORY, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const entryPath = path.join(SCRIPT_OUTPUT_DIRECTORY, entry.name);
    if (statSync(entryPath).mtimeMs < expirationTime) {
      rmSync(entryPath, { force: true });
    }
  }
};

const createRunName = (): string =>
  `${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${String(process.pid)}`;

const createTaskFileName = (command: string): string => {
  const scriptMatch = /^npm run ([^\s]+)/.exec(command);
  const script = scriptMatch?.[1] ?? command;
  return `${sanitizeFileName(script)}-${runName}.log`;
};

const createOutputDirectory = (): void => {
  mkdirSync(SCRIPT_OUTPUT_DIRECTORY, { recursive: true });
  removeExpiredOutputLogs();
};

const runCommand = async (command: string, logPath: string): Promise<void> => {
  const logStream = createWriteStream(logPath);
  const logFinished = finished(logStream);
  const child = spawn(command, {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.pipe(logStream, { end: false });
  child.stderr.pipe(logStream, { end: false });
  const childClosed = new Promise<null | number>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => {
      if (!logStream.destroyed) {
        logStream.end();
      }
      resolve(code);
    });
  });

  let code: null | number;
  try {
    [code] = await Promise.all([childClosed, logFinished]);
  } catch (error) {
    child.kill();
    logStream.destroy();
    throw error;
  }

  if (code === 0) {
    rmSync(logPath, { force: true });
  } else {
    throw new Error(
      `Command failed (${String(code)}): ${command}\nOutput: ${logPath}`,
    );
  }
};

const cpuCount = os.cpus().length || 1;
createOutputDirectory();
const runName = createRunName();

const createTask = (group: TaskGroup): ListrTask => ({
  task: (_context, task) =>
    task.newListr(
      [
        ...(group.groups ?? []).map((childGroup) => createTask(childGroup)),
        ...(group.commands ?? []).map((command) => ({
          task: () =>
            runCommand(
              command,
              path.join(SCRIPT_OUTPUT_DIRECTORY, createTaskFileName(command)),
            ),
          title: command,
        })),
      ],
      { concurrent: group.concurrent ?? false },
    ),
  title: group.name,
});

const listr = new Listr(
  plans[scriptName].map((group) => createTask(group)),
  {
    collectErrors: true,
    concurrent: scriptName === "test:all" ? 1 : cpuCount,
    exitOnError: true,
    fallbackRenderer: "simple",
    rendererOptions: { collapseSubtasks: false },
  },
);

try {
  await listr.run();
} catch {
  /** empty */
}

if (listr.errors?.length) {
  process.exitCode = 1;
}
