import type { AST, Rule } from "eslint";

import { SourceCode } from "eslint";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";

import type { RequireTestCompanionOptions } from "./types";

import { requireTestCompanionRule } from "./rule";

/** Type definition for rule data. */
interface ReportDescriptorWithMessageId {
  /** MessageId field value. */
  messageId?: string;
}

/** Type definition for rule data. */
interface RuleReport {
  /** MessageId helper value. */
  messageId: string | undefined;
}

/** Tracks temporary directories so tests can clean them up. */
const temporaryDirectories: string[] = [];

/**
 * Creates createRepoDirectory.
 * @param root Input root value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createRepoDirectory();
 * ```
 */
const createRepoDirectory = (root: "src" | "tmp"): string => {
  const baseDirectory = path.join(cwd(), root);
  mkdirSync(baseDirectory, { recursive: true });
  return mkdtempSync(path.join(baseDirectory, "test-companion-"));
};

/**
 * Writes a simple TypeScript file at the provided path.
 * @param filePath Input filePath value.
 * @example
 * ```typescript
 * writeFile("/tmp/feature.ts");
 * ```
 */
const writeFile = (filePath: string): void => {
  writeFileSync(filePath, "export const value = 1;", "utf8");
};

/**
 * Creates createTemporaryFile.
 * @param root Input root value.
 * @param filename Input filename value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createTemporaryFile();
 * ```
 */
const createTemporaryFile = (root: "src" | "tmp", filename: string): string => {
  const directory = createRepoDirectory(root);
  temporaryDirectories.push(directory);
  const filePath = path.join(directory, filename);
  writeFile(filePath);
  return filePath;
};

/**
 * Creates multiple temporary files under the given root.
 * @param root Input root value.
 * @param filenames Input filenames value.
 * @returns Paths to the created files.
 * @example
 * ```typescript
 * const paths = createTemporaryFiles("tmp", ["a.ts", "b.ts"]);
 * ```
 */
const createTemporaryFiles = (
  root: "src" | "tmp",
  filenames: string[],
): string[] => {
  const directory = createRepoDirectory(root);
  temporaryDirectories.push(directory);
  return filenames.map((filename) => {
    const filePath = path.join(directory, filename);
    writeFile(filePath);
    return filePath;
  });
};

/**
 * Creates a temporary file pair for test/source combinations.
 * @param root Input root value.
 * @param first Input first value.
 * @param second Input second value.
 * @returns Tuple of created file paths.
 * @throws {Error} When the file paths are missing.
 * @example
 * ```typescript
 * const [source, test] = createTemporaryPair("tmp", "a.ts", "a.spec.ts");
 * ```
 */
const createTemporaryPair = (
  root: "src" | "tmp",
  first: string,
  second: string,
): [string, string] => {
  const [firstPath, secondPath] = createTemporaryFiles(root, [
    first,
    second,
  ]) as [string, string];

  return [firstPath, secondPath];
};

/**
 * Creates createProgramAst.
 * @returns Return value output.
 * @example
 * ```typescript
 * createProgramAst();
 * ```
 */
const createProgramAst = (): AST.Program => ({
  body: [],
  comments: [],
  loc: {
    end: { column: 0, line: 1 },
    start: { column: 0, line: 1 },
  },
  range: [0, 0],
  sourceType: "module",
  tokens: [],
  type: "Program",
});

/**
 * Creates a rule context for the given filename.
 * @param filename Input filename value.
 * @param reports Input reports value.
 * @param sourceCode Input sourceCode value.
 * @returns Rule context for tests.
 * @example
 * ```typescript
 * const context = createRuleContext(file, reports, sourceCode);
 * ```
 */
const createRuleContext = (
  filename: string,
  reports: RuleReport[],
  sourceCode: SourceCode,
): Rule.RuleContext =>
  ({
    cwd: cwd(),
    filename,
    id: "require-test-companion",
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    options: [],
    parserOptions: {},
    parserPath: void 0,
    physicalFilename: filename,
    report: (report: Rule.ReportDescriptor): void => {
      const { messageId } = report as ReportDescriptorWithMessageId;
      reports.push({ messageId });
    },
    settings: {},
    sourceCode,
  }) as unknown as Rule.RuleContext;

/**
 * Runs the rule listeners for a context.
 * @param context Input context value.
 * @example
 * ```typescript
 * runListeners(context);
 * ```
 */
const runListeners = (context: Rule.RuleContext): void => {
  const listeners = requireTestCompanionRule.create(context);
  const programNode = context.sourceCode.ast;
  const programListener = listeners.Program;

  programListener?.(programNode);
};

/**
 * Runs the rule with the given options.
 * @param filename Input filename value.
 * @param options Input options value.
 * @returns Collected rule reports.
 * @example
 * ```typescript
 * const reports = runRule("/tmp/feature.ts");
 * ```
 */
const runRule = (
  filename: string,
  options?: RequireTestCompanionOptions,
): RuleReport[] => {
  const reports: RuleReport[] = [];
  const programAst = createProgramAst();
  const sourceCode = new SourceCode("", programAst);
  const context = createRuleContext(filename, reports, sourceCode);
  context.options = options === void 0 ? [] : [options];

  runListeners(context);

  return reports;
};

/**
 * Cleans up temporary directories created by tests.
 * @example
 * ```typescript
 * cleanupTemporaryDirectories();
 * ```
 */
const cleanupTemporaryDirectories = (): void => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
};

export {
  cleanupTemporaryDirectories,
  createTemporaryFile,
  createTemporaryPair,
  runRule,
};
