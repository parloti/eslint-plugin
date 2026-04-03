import type { Linter } from "eslint";

import { ESLint } from "eslint";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parser } from "typescript-eslint";

import { preferVitestIncrementalCastsRule } from "../../src";
import { createTemporaryFixtureManager } from "./temporary-fixtures";

/** Result of running the rule with autofix enabled. */
interface FixRunResult {
  /** Lint messages produced during the run. */
  messages: Linter.LintMessage[];

  /** Output code after fixes. */
  output: string;
}

/** Temporary fixture manager reused across helper runs. */
const temporaryFixtureManager = createTemporaryFixtureManager();

/** Ambient declarations used by the temporary typed fixture project. */
const defaultDeclarationText = [
  'declare module "fixture-module" {',
  "  export const configs: { disableTypeChecked: { rules: string[]; strict: boolean } };",
  "  export const extra: number;",
  "  export const parser: { parseForESLint(code: string): { ast: string } };",
  "  export const plugin: { meta: { name: string } };",
  "}",
  "",
  "declare const vi: {",
  '  doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => typeof import("fixture-module")): void;',
  '  doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => Partial<typeof import("fixture-module")>): void;',
  '  doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => Promise<Partial<typeof import("fixture-module")>>): void;',
  '  mock(specifier: Promise<typeof import("fixture-module")>, factory: () => typeof import("fixture-module")): void;',
  '  mock(specifier: Promise<typeof import("fixture-module")>, factory: () => Partial<typeof import("fixture-module")>): void;',
  '  mock(specifier: Promise<typeof import("fixture-module")>, factory: (importOriginal: () => Promise<typeof import("fixture-module")>) => Promise<Partial<typeof import("fixture-module")>>): void;',
  "};",
  "",
].join("\n");

/**
 * Creates the temporary tsconfig used by typed ESLint runs.
 * @returns Serialized tsconfig file contents.
 * @example
 * ```typescript
 * const tsconfigText = createTsconfigText();
 * void tsconfigText;
 * ```
 */
const createTsconfigText = (): string =>
  JSON.stringify(
    {
      compilerOptions: {
        module: "esnext",
        moduleResolution: "bundler",
        noEmit: true,
        strict: true,
        target: "esnext",
      },
      include: ["**/*.ts", "**/*.d.ts"],
    },
    void 0,
    2,
  );

/**
 * Creates the typed ESLint instance used by the helper runs.
 * @param directory Fixture directory that becomes ESLint cwd.
 * @param tsconfigPath Path to the generated fixture tsconfig.
 * @returns ESLint instance configured for the typed rule.
 * @example
 * ```typescript
 * const eslint = createTypedRuleEslint("tmp/project", "tmp/project/tsconfig.json");
 * void eslint;
 * ```
 */
const createTypedRuleEslint = (
  directory: string,
  tsconfigPath: string,
): ESLint =>
  new ESLint({
    cwd: directory,
    fix: true,
    ignore: false,
    overrideConfig: [
      {
        files: ["**/*.ts"],
        languageOptions: {
          parser,
          parserOptions: {
            ecmaVersion: 2022,
            project: [tsconfigPath],
            sourceType: "module",
            tsconfigRootDir: directory,
          },
        },
        plugins: {
          codeperfect: {
            rules: {
              "prefer-vitest-incremental-casts":
                preferVitestIncrementalCastsRule,
            },
          },
        },
        rules: {
          "codeperfect/prefer-vitest-incremental-casts": "error",
        },
      },
    ],
    overrideConfigFile: true,
  });

/**
 * Removes temporary fixture directories created by this helper.
 * @example
 * ```typescript
 * cleanupTemporaryDirectories();
 * ```
 */
function cleanupTemporaryDirectories(): void {
  temporaryFixtureManager.cleanupTemporaryDirectories();
}

/**
 * Creates a unique file path for one isolated lint run.
 * @param directory Temporary fixture directory.
 * @returns Unique file path for the current run.
 * @example
 * ```typescript
 * const filePath = createRunFilePath("tmp/project");
 * void filePath;
 * ```
 */
function createRunFilePath(directory: string): string {
  return path.join(directory, "example.spec.ts");
}

/**
 * Runs the rule with autofix enabled inside a temporary typed fixture project.
 * @param code Source code passed to ESLint.
 * @param declarationText Ambient declarations used by the fixture project.
 * @returns Fixed output and lint messages.
 * @throws {Error} When ESLint does not return a lint result.
 * @example
 * ```typescript
 * const result = await runFix("vi.doMock(import(\"fixture-module\"), () => ({}));\n");
 * ```
 */
async function runFix(
  code: string,
  declarationText = defaultDeclarationText,
): Promise<FixRunResult> {
  const fixtureSet = temporaryFixtureManager.createFixtureSet({
    "globals.d.ts": declarationText,
    "tsconfig.json": createTsconfigText(),
  });
  const filePath = createRunFilePath(fixtureSet.directory);
  const eslint = createTypedRuleEslint(
    fixtureSet.directory,
    fixtureSet.getFilePath("tsconfig.json"),
  );

  await writeFile(filePath, code, "utf8");

  try {
    const [result] = await eslint.lintText(code, { filePath });

    if (result === void 0) {
      throw new Error("Expected ESLint to return a lint result.");
    }

    return {
      messages: result.messages,
      output: result.output ?? code,
    };
  } finally {
    await rm(fixtureSet.directory, { force: true, recursive: true });
  }
}

export { cleanupTemporaryDirectories, runFix };
