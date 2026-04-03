import type { Linter } from "eslint";

import { ESLint } from "eslint";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parser } from "typescript-eslint";

import { preferVitestIncrementalCastsRule } from "./rule";

/** Type definition for rule data. */
interface FixRunResult {
  /** Lint messages produced during the run. */
  messages: Linter.LintMessage[];

  /** Output code after fixes. */
  output: string;
}

/** Type definition for rule data. */
interface FixtureProject {
  /** Temporary fixture directory path. */
  directory: string;

  /** Promise used to serialize runs that share one cached ESLint project. */
  pendingRun: Promise<void>;

  /** Fixture tsconfig path used by typed ESLint. */
  tsconfigPath: string;
}

/** Mutable state used while one queued lint run is in flight. */
interface QueuedRunState {
  /** Resolver that releases the next queued run once the current run completes. */
  releaseCurrentRun: (() => void) | undefined;
}

/** Typed fixture projects cached by their declaration text. */
const fixtureProjectsByDeclaration = new Map<string, FixtureProject>();

/** Monotonic counter used to create isolated per-run scratch files. */
let fixtureRunCounter = 0;

/** Ambient declarations used by the typed fixture project. */
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

/** Temporary fixture directories pending cleanup. */
const temporaryDirectories: string[] = [];

/**
 * Creates the fixture tsconfig text used by typed rule runs.
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
 * Creates the typed ESLint instance used by the rule tests.
 * @param directory Fixture directory that becomes ESLint cwd.
 * @param tsconfigPath Path to the generated fixture tsconfig.
 * @returns ESLint instance configured for the typed rule.
 * @example
 * ```typescript
 * const eslint = createTypedRuleEslint("/tmp/project", "/tmp/project/tsconfig.json");
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
 * Creates the temporary fixture project used by typed helper runs.
 * @param declarationText Ambient declarations used by the fixture project.
 * @returns Cached fixture project state.
 * @example
 * ```typescript
 * const fixtureProject = await createFixtureProject(defaultDeclarationText);
 * void fixtureProject;
 * ```
 */
const createFixtureProject = async (
  declarationText: string,
): Promise<FixtureProject> => {
  const directory = await mkdtemp(path.join(tmpdir(), "codeperfect-rule-"));
  const globalsPath = path.join(directory, "globals.d.ts");
  const tsconfigPath = path.join(directory, "tsconfig.json");

  temporaryDirectories.push(directory);
  await Promise.all([
    writeFile(globalsPath, declarationText, "utf8"),
    writeFile(tsconfigPath, createTsconfigText(), "utf8"),
  ]);

  return { directory, pendingRun: Promise.resolve(), tsconfigPath };
};

/**
 * Creates a unique file path for one isolated lint run.
 * @param directory Temporary fixture directory.
 * @returns Unique file path for the current run.
 * @example
 * ```typescript
 * createRunFilePath("/tmp/project");
 * ```
 */
const createRunFilePath = (directory: string): string => {
  fixtureRunCounter += 1;
  return path.join(directory, `example-${fixtureRunCounter}.spec.ts`);
};

/**
 * Runs one lint callback exclusively for a cached fixture project.
 * @template Result Callback result type.
 * @param fixtureProject Cached fixture project state.
 * @param callback Async work executed once prior runs complete.
 * @returns Callback result.
 * @example
 * ```typescript
 * const result = await runExclusive(fixtureProject, async () => "done");
 * void result;
 * ```
 */
const runExclusive = async <Result>(
  fixtureProject: FixtureProject,
  callback: () => Promise<Result>,
): Promise<Result> => {
  const previousRun = fixtureProject.pendingRun;
  const runState: QueuedRunState = { releaseCurrentRun: void 0 };

  fixtureProject.pendingRun = new Promise<void>((resolve) => {
    runState.releaseCurrentRun = resolve;
  });

  await previousRun;

  try {
    return await callback();
  } finally {
    runState.releaseCurrentRun?.();
  }
};

/**
 * Gets or creates the cached typed fixture project for one declaration shape.
 * @param declarationText Ambient declarations used by the fixture project.
 * @returns Cached typed fixture project.
 * @example
 * ```typescript
 * const fixtureProject = await getFixtureProject(defaultDeclarationText);
 * void fixtureProject;
 * ```
 */
const getFixtureProject = async (
  declarationText: string,
): Promise<FixtureProject> => {
  const cachedFixtureProject =
    fixtureProjectsByDeclaration.get(declarationText);

  if (cachedFixtureProject !== void 0) {
    return cachedFixtureProject;
  }

  const fixtureProject = await createFixtureProject(declarationText);
  fixtureProjectsByDeclaration.set(declarationText, fixtureProject);

  return fixtureProject;
};

/**
 * Removes temporary fixture projects created during rule tests.
 * @returns Promise that resolves after cleanup completes.
 * @example
 * ```typescript
 * await cleanupTemporaryDirectories();
 * ```
 */
const cleanupTemporaryDirectories = async (): Promise<void> => {
  fixtureProjectsByDeclaration.clear();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map(async (directory) =>
        rm(directory, { force: true, recursive: true }),
      ),
  );
};

/**
 * Runs the rule with autofix enabled inside a temporary typed fixture project.
 * @param code Source code passed to ESLint.
 * @param declarationText Ambient declarations used by the fixture project.
 * @returns Fixed output and lint messages.
 * @throws {Error} When ESLint does not return a lint result.
 * @example
 * ```typescript
 * const result = await runFix("vi.doMock(import(\"fixture-module\"), () => ({}));\n");
 * void result;
 * ```
 */
const runFix = async (
  code: string,
  declarationText = defaultDeclarationText,
): Promise<FixRunResult> => {
  const fixtureProject = await getFixtureProject(declarationText);

  return runExclusive(fixtureProject, async () => {
    const filePath = createRunFilePath(fixtureProject.directory);
    const eslint = createTypedRuleEslint(
      fixtureProject.directory,
      fixtureProject.tsconfigPath,
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
      await rm(filePath, { force: true });
    }
  });
};

export { cleanupTemporaryDirectories, runFix };
