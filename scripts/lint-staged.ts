import chalk from "chalk";
import { execSync } from "node:child_process";

/** Milliseconds in one second. */
const MS_PER_SEC = 1000;

/**
 * Prints the lint-staged warning banner.
 * @example
 * ```typescript
 * logBanner();
 * ```
 */
const logBanner = (): void => {
  console.log(chalk.bold.underline.bgRed.inverse(">>>>> WARNING <<<<<\n"));
  console.log(
    `${chalk.red("Running")}${chalk.bold(' "lint-staged"')}${chalk.red("!")}
`,
  );
  console.log(
    `${chalk.bold.underline.red("DO NOT")}${chalk.red(" change repository files while")}${chalk.bold(
      ' "lint-staged"',
    )}${chalk.red(" is running!\n")}`,
  );
};

/**
 * Logs the lint-staged success message with timing.
 * @param getTimeDiff Callback returning a formatted duration.
 * @example
 * ```typescript
 * logSuccess(() => "1.2s");
 * ```
 */
const logSuccess = (getTimeDiff: () => string): void => {
  console.log(
    `${chalk.bold.green('"lint-staged"')}${chalk.reset()}${chalk.green(
      " executed!",
    )}`,
  );
  console.log("Files can already be changed.");
  console.log(`"lint-staged" executed in ${getTimeDiff()}`);
};

/**
 * Runs the lint-staged command and reports failures.
 * @param getTimeDiff Callback returning a formatted duration.
 * @throws {Error} Propagates the lint-staged execution error.
 * @example
 * ```typescript
 * runLintStagedCommand(() => "1.2s");
 * ```
 */
const runLintStagedCommand = (getTimeDiff: () => string): void => {
  try {
    execSync("npx --yes lint-staged --config lint-staged.config.ts", {
      stdio: "inherit",
    });
    logSuccess(getTimeDiff);
  } catch (error) {
    const message = `"lint-staged" ${chalk.bold.underline.red("FAILED")} in ${getTimeDiff()}`;
    console.error(message);
    throw error;
  }
};

/**
 * Runs lint-staged with banner and timing output.
 * @example
 * ```typescript
 * runLintStaged();
 * ```
 */
const runLintStaged = (): void => {
  const start = Date.now();
  const getTimeDiff = (): string =>
    `${String((Date.now() - start) / MS_PER_SEC)}s`;

  logBanner();
  runLintStagedCommand(getTimeDiff);
};

runLintStaged();
