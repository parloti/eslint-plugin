import { Listr } from "listr2";
import { spawn } from "node:child_process";
import {
  createWriteStream,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

type TaskPlan = readonly (readonly string[])[];

const plans: Record<string, TaskPlan> = {
  build: [["npm run clean", "npm run compile", "npm run resolve-paths"]],
  "eslint:fix": [["npm run check:rules", "npm run eslint -- --fix"]],
  "lint:fix": [["npm run fmt", "npm run eslint:fix"]],
  "lint:run": [["npm run prettier"], ["npm run eslint"]],
  "test:all": [["npm run e2e"], ["npm run test"], ["npm run mutation"]],
  validate: [
    ["npm run build", "npm run pack"],
    ["npm run typecheck"],
    ["npm run lint"],
    ["npm run test:all"],
  ],
};

const scriptName = process.argv[2];
if (scriptName === undefined || plans[scriptName] === undefined) {
  throw new Error(`Unknown managed script: ${scriptName ?? "<missing>"}`);
}

const sanitizeFileName = (value: string): string =>
  value.replaceAll(/[^a-zA-Z0-9._-]+/g, "-").replaceAll(/^-|-$/g, "");

const TEMP_DIRECTORY = path.resolve("temp");
const OUTPUT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const removeExpiredRunDirectories = (): void => {
  const expirationTime = Date.now() - OUTPUT_RETENTION_MS;
  const entries = readdirSync(TEMP_DIRECTORY, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const entryPath = path.join(TEMP_DIRECTORY, entry.name);
    if (statSync(entryPath).mtimeMs < expirationTime) {
      rmSync(entryPath, { force: true, recursive: true });
    }
  }
};

const createRunDirectory = (): string => {
  mkdirSync(TEMP_DIRECTORY, { recursive: true });
  removeExpiredRunDirectories();
  const runName = `${sanitizeFileName(scriptName)}-${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${String(process.pid)}`;
  const runDirectory = path.join(TEMP_DIRECTORY, runName);
  mkdirSync(runDirectory, { recursive: true });
  return runDirectory;
};

const runCommand = (command: string, logPath: string): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const logStream = createWriteStream(logPath);
    const child = spawn(command, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);
    child.once("error", (error) => {
      logStream.destroy();
      reject(error);
    });
    child.once("close", (code) => {
      logStream.end(() => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed (${String(code)}): ${command}`));
        }
      });
    });
  });

const cpuCount = os.cpus().length || 1;
const runDirectory = createRunDirectory();
const groupLinks: string[] = [];

const listr = new Listr(
  plans[scriptName].map((commands, groupIndex) => ({
    task: (_context, task) => {
      const groupName = `group-${String(groupIndex + 1).padStart(3, "0")}`;
      const groupFile = `${groupName}.md`;
      const taskLinks = commands.map((command, taskIndex) => {
        const taskFile = `task-${String(taskIndex + 1).padStart(3, "0")}-${sanitizeFileName(command)}.log`;
        return { command, taskFile };
      });
      const groupPath = path.join(runDirectory, groupFile);
      writeFileSync(
        groupPath,
        `# ${groupName}\n\n${taskLinks.map(({ command, taskFile }) => `- [${command}](${taskFile})`).join("\n")}\n`,
      );
      groupLinks.push(`[${groupName}](${groupFile})`);

      return task.newListr(
        taskLinks.map(({ command, taskFile }) => ({
          task: () => runCommand(command, path.join(runDirectory, taskFile)),
          title: command,
        })),
        // Commands within a group are ordered dependencies; run them
        // sequentially even though groups themselves run concurrently.
        { concurrent: false },
      );
    },
    title: `Group ${String(groupIndex + 1)}`,
  })),
  {
    collectErrors: true,
    concurrent: scriptName === "test:all" ? 1 : cpuCount,
    exitOnError: true,
    fallbackRenderer: "simple",
  },
);

await listr.run();

writeFileSync(
  path.join(runDirectory, "README.md"),
  `# ${scriptName}\n\n${groupLinks.map((link) => `- ${link}`).join("\n")}\n`,
);

if (listr.errors?.length) {
  process.exitCode = 1;
}
