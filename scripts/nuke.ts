import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

interface ProcessDetails {
  commandLine: string;
  parentId: number;
  pid: number;
}

interface RunOptions {
  env?: NodeJS.ProcessEnv;
}

const windowsProcessScript = String.raw`
$ErrorActionPreference = 'Stop'
$processes = @(Get-CimInstance -ClassName Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CommandLine)
$parents = @{}
foreach ($item in $processes) { $parents[[int]$item.ProcessId] = [int]$item.ParentProcessId }
$protected = [System.Collections.Generic.HashSet[int]]::new()
$current = [int]$env:NUKE_PROCESS_ID
while ($current -gt 0 -and $parents.ContainsKey($current) -and $protected.Add($current)) { $current = $parents[$current] }
$root = $env:NUKE_REPO_PATH.Replace('/', '\')
$pattern = [regex]::Escape($root) + '(?:[\\/]|$|"|\s|[=:,;)])'
$targets = @($processes | Where-Object {
  $_.Name -ieq 'node.exe' -and
  -not $protected.Contains([int]$_.ProcessId) -and
  $_.CommandLine -and
  [regex]::IsMatch($_.CommandLine.Replace('/', '\'), $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
})
$ids = @($targets | ForEach-Object { [int]$_.ProcessId })
foreach ($id in $ids) { Stop-Process -Id $id -Force }
$deadline = [DateTime]::UtcNow.AddSeconds(5)
$remaining = @()
do {
  $remaining = @($ids | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })
  if ($remaining.Count -gt 0) { Start-Sleep -Milliseconds 50 }
} while ($remaining.Count -gt 0 -and [DateTime]::UtcNow -lt $deadline)
if ($remaining.Count -gt 0) { throw 'Timed out waiting for Node.js processes to exit.' }
foreach ($id in $ids) { Write-Output $id }
`;

const run = (
  command: string,
  args: string[],
  options: RunOptions = {},
): string => {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      result.stderr.trim() ||
        `${command} exited with status ${String(result.status)}.`,
    );
  }
  return result.stdout;
};

const processAncestors = (
  processes: readonly ProcessDetails[],
  processId: number,
): Set<number> => {
  const parents = new Map<number, number>(
    processes.map(({ parentId, pid }): [number, number] => [pid, parentId]),
  );
  const ancestors = new Set<number>();
  let current = processId;
  while (current > 0 && parents.has(current) && !ancestors.has(current)) {
    ancestors.add(current);
    current = parents.get(current) ?? 0;
  }
  return ancestors;
};

const hasRepositoryPath = (
  commandLine: string,
  repositoryPath: string,
): boolean => {
  let offset = 0;
  while ((offset = commandLine.indexOf(repositoryPath, offset)) !== -1) {
    const remainder = commandLine.slice(offset + repositoryPath.length);
    if (remainder.length === 0 || /^[\\/\s"'=,:;)]/.test(remainder))
      return true;
    offset += repositoryPath.length;
  }
  return false;
};

const stopWindowsNodeProcesses = (repositoryPath: string): number => {
  const output = run(
    "powershell.exe",
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      windowsProcessScript,
    ],
    {
      env: {
        ...process.env,
        NUKE_PROCESS_ID: String(process.pid),
        NUKE_REPO_PATH: repositoryPath,
      },
    },
  );
  return output.split(/\r?\n/).filter(Boolean).length;
};

const stopUnixNodeProcesses = async (
  repositoryPath: string,
): Promise<number> => {
  const output = run("ps", ["-eo", "pid=,ppid=,args="]);
  const processes: ProcessDetails[] = output.split(/\r?\n/).flatMap((line) => {
    const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (!match) return [];
    return {
      commandLine: match[3] ?? "",
      parentId: Number(match[2]),
      pid: Number(match[1]),
    };
  });
  const protectedProcesses = processAncestors(processes, process.pid);
  const targets = processes.filter(({ commandLine, pid }) => {
    const executableMatch = /^"([^"]+)"|^(\S+)/.exec(commandLine);
    const executable = executableMatch?.[1] ?? executableMatch?.[2];
    const executableName =
      executable === undefined ? "" : path.basename(executable);
    return (
      !protectedProcesses.has(pid) &&
      /^(?:node|nodejs)$/i.test(executableName) &&
      hasRepositoryPath(commandLine, repositoryPath)
    );
  });

  for (const { pid } of targets) {
    try {
      process.kill(pid, "SIGKILL");
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ESRCH"
      ))
        throw error;
    }
  }

  const deadline = Date.now() + 5000;
  let remaining = targets;
  while (targets.length > 0 && Date.now() < deadline) {
    remaining = remaining.filter(({ pid }) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ESRCH")
          return false;
        throw error;
      }
    });
    if (remaining.length === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (remaining.length > 0) {
    throw new Error("Timed out waiting for Node.js processes to exit.");
  }
  return targets.length;
};

const main = async (): Promise<void> => {
  const repositoryPath = process.cwd();
  const stopped =
    process.platform === "win32"
      ? stopWindowsNodeProcesses(repositoryPath)
      : await stopUnixNodeProcesses(repositoryPath);
  if (stopped > 0) {
    console.log(
      `Stopped ${String(stopped)} Node.js process${stopped === 1 ? "" : "es"}.`,
    );
  }

  const result = spawnSync("git", ["clean", "-xfd"], {
    cwd: repositoryPath,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
};

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
