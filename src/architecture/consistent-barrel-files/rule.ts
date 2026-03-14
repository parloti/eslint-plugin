import type { Rule } from "eslint";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import { buildListenerForFile } from "./consistent-barrel-files-listeners";
import {
  getOptions,
  isLintableFilename,
} from "./consistent-barrel-files-options";

/**
 * ESLint rule requiring consistent barrel file usage by folder.
 * @example
 * ```typescript
 * const rule = consistentBarrelFilesRule;
 * ```
 */
const consistentBarrelFilesRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    const { filename, options } = context;

    if (!isLintableFilename(filename)) {
      return {};
    }

    return buildListenerForFile(context, filename, getOptions(options));
  },
  meta: {
    docs: createRuleDocumentation(
      "consistent-barrel-files",
      "Enforce or forbid barrel files with consistent, allowed names.",
    ),
    messages: {
      forbiddenBarrel:
        "Barrel files are forbidden. Remove the barrel file '{{name}}'.",
      missingBarrel:
        "Each folder must include a barrel file named one of: {{names}}.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          enforce: { type: "boolean" },
          folders: {
            oneOf: [
              { type: "string" },
              {
                items: { type: "string" },
                minItems: 1,
                type: "array",
              },
            ],
          },
          names: {
            oneOf: [
              { type: "string" },
              {
                items: { type: "string" },
                minItems: 1,
                type: "array",
              },
            ],
          },
        },
        type: "object",
      },
    ],
    type: "problem",
  },
};

export { consistentBarrelFilesRule };
