import type { Rule } from "eslint";

import {
  DEFAULT_ALLOW_IN_FILES,
  DEFAULT_TEST_FILE_PATTERNS,
  getOptions,
  isAllowlistedFile,
  isLintableFilename,
} from "./no-unused-exports-options";
import {
  classifyExportUsage,
  collectCrossFileUsages,
  collectExportedElements,
  getTypeScriptProgram,
} from "./no-unused-exports-utilities";

/** ESLint rule flagging exports unused in production code. */
const noUnusedExportsRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    const state = getOptions(context.options);
    const filename = context.filename;

    if (!isLintableFilename(filename) || isAllowlistedFile(filename, state)) {
      return {};
    }

    const program = getTypeScriptProgram(context);

    if (program === void 0) {
      return {};
    }

    return {
      Program(node): void {
        const exportedElements = collectExportedElements(node.body);

        if (exportedElements.length === 0) {
          return;
        }

        const usages = collectCrossFileUsages(program, filename, state);

        for (const element of exportedElements) {
          const usageClassification = classifyExportUsage(
            element.exportedName,
            usages,
          );

          if (usageClassification === "production") {
            continue;
          }

          context.report({
            data: { exportedName: element.exportedName },
            messageId:
              usageClassification === "test-only"
                ? "usedOnlyInTests"
                : "unusedExport",
            node: element.node,
          });
        }
      },
    };
  },
  meta: {
    defaultOptions: [
      {
        allowInFiles: [...DEFAULT_ALLOW_IN_FILES],
        testFilePatterns: [...DEFAULT_TEST_FILE_PATTERNS],
      },
    ],
    docs: {
      description:
        "Disallow exports that are unused or consumed only by test files.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/no-unused-exports.md",
    },
    messages: {
      unusedExport:
        "Export '{{exportedName}}' is never consumed by any file in the project.",
      usedOnlyInTests:
        "Export '{{exportedName}}' is consumed only by test files.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          allowInFiles: {
            description:
              "File globs where exports can remain unused without diagnostics.",
            items: { type: "string" },
            minItems: 1,
            type: "array",
          },
          testFilePatterns: {
            description:
              "File globs treated as tests when classifying export consumers.",
            items: { type: "string" },
            minItems: 1,
            type: "array",
          },
        },
        type: "object",
      },
    ],
    type: "problem",
  },
};

export { noUnusedExportsRule };
