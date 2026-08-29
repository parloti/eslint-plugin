import type { Rule } from "eslint";

import { isLintableModuleFile } from "./barrel-file-utilities";
import { buildListenerForFile } from "./consistent-barrel-files-listeners";
import { getOptions } from "./consistent-barrel-files-options";

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

    if (!isLintableModuleFile(filename)) {
      return {};
    }

    return buildListenerForFile(context, filename, getOptions(options));
  },
  meta: {
    defaultOptions: [{ allowedNames: ["index"], enforce: true }],
    docs: {
      description:
        "Enforce or forbid barrel files with consistent, allowed names.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/consistent-barrel-files.md",
    },
    messages: {
      forbiddenBarrel:
        "Barrel files are forbidden. Remove the barrel file '{{name}}'.",
      missingBarrel:
        "Each folder must include a barrel file named with one of these stems: {{names}}.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          allowedNames: {
            description:
              "Allowed barrel basenames that the rule recognizes in each folder.",
            items: { type: "string" },
            type: "array",
          },
          enforce: {
            description:
              "Whether each eligible folder must contain one of the allowed barrel filenames.",
            type: "boolean",
          },
        },
        type: "object",
      },
    ],
    type: "problem",
  },
};

export { consistentBarrelFilesRule };
