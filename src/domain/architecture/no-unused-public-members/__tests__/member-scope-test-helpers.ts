import type { Linter as LinterTypes } from "eslint";
import type * as ts from "typescript";

import { Linter } from "eslint";
import { parser } from "typescript-eslint";

import type { NoUnusedExportsOptions } from "../../no-unused-exports/types";

import { noUnusedExportsRule } from "../../no-unused-exports/rule";
import { noUnusedPublicMembersRule } from "../rule";

/**
 * Creates a typed linter for scope and rule-independence fixtures.
 * @param root Temporary project directory.
 * @param program Fixture TypeScript program.
 * @param options Member-rule options.
 * @returns Linter and its explicit flat configuration.
 * @example
 * ```typescript
 * const { config, linter } = createScopeLinter(root, program);
 * ```
 */
const createScopeLinter = (
  root: string,
  program: ts.Program,
  options: NoUnusedExportsOptions = {},
) => ({
  config: [
    {
      files: ["**/*.ts"],
      languageOptions: {
        parser,
        parserOptions: { programs: [program], tsconfigRootDir: root },
      },
      plugins: {
        codeperfect: {
          rules: {
            "no-unused-exports": noUnusedExportsRule,
            "no-unused-public-members": noUnusedPublicMembersRule,
          },
        },
      },
      rules: {
        "codeperfect/no-unused-exports": "off",
        "codeperfect/no-unused-public-members": ["error", options],
      },
    },
  ] satisfies LinterTypes.Config[],
  linter: new Linter({ configType: "flat", cwd: root }),
});

export { createScopeLinter };
