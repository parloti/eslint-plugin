import type { Linter } from "eslint";

import { ESLint } from "eslint";
import { parser } from "typescript-eslint";

import type { TemporaryFixtureManager } from "./temporary-fixtures";

import { noUnusedPublicMembersRule } from "../../src";
import { temporaryProjectTsconfig } from "./no-unused-exports-fixtures";

/** One fixture-backed lint run input. */
export interface NoUnusedPublicMembersFixtureRun {
  /** Files written to the temporary project. */
  files: Record<string, string>;

  /** Optional rule options. */
  ruleOptions?: unknown[];

  /** Relative path of the file being linted. */
  targetRelativePath: string;
}

/**
 * Creates a typed ESLint instance configured with the new rule.
 * @param directory Fixture project root.
 * @param tsconfigPath Absolute project tsconfig path.
 * @param ruleOptions Optional rule options.
 * @returns Configured ESLint instance.
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
            rules: { "no-unused-public-members": noUnusedPublicMembersRule },
          },
        },
        rules: { "codeperfect/no-unused-public-members": ruleEntry },
      },
    ],
    overrideConfigFile: true,
  });
};

/**
 * Creates a fixture lint callback for one temporary project manager.
 * @param fixtureManager Temporary fixture manager.
 * @returns Callback that lints a fixture and returns message identifiers.
 * @example
 * ```typescript
 * const lintFixture = createFixtureLintRunner(fixtureManager);
 * ```
 */
const createFixtureLintRunner =
  (fixtureManager: TemporaryFixtureManager) =>
  async (run: NoUnusedPublicMembersFixtureRun): Promise<string[]> => {
    const fixtureSet = fixtureManager.createFixtureSet(
      { ...run.files, "tsconfig.json": temporaryProjectTsconfig },
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

    return (result?.messages ?? []).map((message) => message.messageId ?? "");
  };

export { createFixtureLintRunner };
