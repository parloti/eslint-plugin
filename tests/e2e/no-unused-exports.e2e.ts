import type { Linter } from "eslint";

import { ESLint } from "eslint";
import { parser } from "typescript-eslint";
import { afterAll, describe, expect, it } from "vitest";

import { noUnusedExportsRule } from "../../src";
import { createTemporaryFixtureManager } from "../support";

/** One fixture-backed lint run input. */
interface LintFixtureRun {
  /** Files written to the temporary project. */
  files: Record<string, string>;

  /** Optional rule options. */
  ruleOptions?: unknown[];

  /** Relative path of the file being linted. */
  targetRelativePath: string;
}

/**
 * Creates the typed ESLint instance for one temporary fixture project.
 * @param directory Temporary fixture directory.
 * @param tsconfigPath Absolute tsconfig path.
 * @param ruleOptions Optional rule options.
 * @returns ESLint instance configured with the new rule.
 * @example
 * ```typescript
 * const eslint = createTypedRuleEslint(directory, tsconfigPath);
 * ```
 */
const createTypedRuleEslint = (
  directory: string,
  tsconfigPath: string,
  ruleOptions: unknown[] = [],
): ESLint => {
  const ruleEntry: Linter.RuleEntry = ["error", ...ruleOptions];

  return new ESLint({
    cwd: directory,
    fix: false,
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
              "no-unused-exports": noUnusedExportsRule,
            },
          },
        },
        rules: {
          "codeperfect/no-unused-exports": ruleEntry,
        },
      },
    ],
    overrideConfigFile: true,
  });
};

/**
 * Runs one fixture-backed lint scenario.
 * @param run Fixture run definition.
 * @returns Message ids emitted for the linted target file.
 * @example
 * ```typescript
 * const messageIds = await runFixtureLint(run);
 * ```
 */
const runFixtureLint = async (run: LintFixtureRun): Promise<string[]> => {
  const fixtureManager = createTemporaryFixtureManager();
  const fixtureSet = fixtureManager.createFixtureSet(
    {
      ...run.files,
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            module: "esnext",
            moduleResolution: "bundler",
            noEmit: true,
            strict: true,
            target: "esnext",
          },
          include: ["**/*.ts"],
        },
        void 0,
        2,
      ),
    },
    "tmp",
  );

  const eslint = createTypedRuleEslint(
    fixtureSet.directory,
    fixtureSet.getFilePath("tsconfig.json"),
    run.ruleOptions,
  );
  const [result] = await eslint.lintFiles([
    fixtureSet.getFilePath(run.targetRelativePath),
  ]);

  fixtureManager.cleanupTemporaryDirectories();

  return (result?.messages ?? []).map((message) => message.messageId ?? "");
};

describe("no-unused-exports e2e", () => {
  const fixtureManager = createTemporaryFixtureManager();

  afterAll(() => {
    fixtureManager.cleanupTemporaryDirectories();
  });

  it("accepts exports consumed by production files", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import { feature } from "./feature";',
          "console.log(feature);",
        ].join("\n"),
        "src/feature.ts": "export const feature = 1;",
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("reports exports consumed only by tests", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.spec.ts": [
          'import { feature } from "./feature";',
          "void feature;",
        ].join("\n"),
        "src/feature.ts": "export const feature = 1;",
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual(["usedOnlyInTests"]);
  });

  it("reports fully unused exports", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": "export const orphan = 1;",
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual(["unusedExport"]);
  });

  it("skips configured allowlisted files", async () => {
    // Arrange
    const run = {
      files: {
        "src/index.ts": "export const barrel = 1;",
      },
      targetRelativePath: "src/index.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("reports test-only usage for re-export specifiers", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": "export const feature = 1;",
        "src/reexport.spec.ts": [
          'import { feature } from "./reexport";',
          "void feature;",
        ].join("\n"),
        "src/reexport.ts": 'export { feature } from "./feature";',
      },
      targetRelativePath: "src/reexport.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual(["usedOnlyInTests"]);
  });
});
