import type { Rule } from "eslint";

import path from "node:path";

import { collectExportedElements } from "./no-unused-exports-declaration-utilities";
import { getTypeScriptProgram } from "./no-unused-exports-identifier-utilities";
import {
  DEFAULT_PUBLIC_API_FILES,
  DEFAULT_TEST_FILE_PATTERNS,
  getOptions,
  isLintableFilename,
  isPublicApiFile,
} from "./no-unused-exports-options";
import {
  classifyExportUsage,
  collectCrossFileUsages,
} from "./no-unused-exports-usage-utilities";

/** ESLint rule flagging exports unused in production code. */
const noUnusedExportsRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    const state = getOptions(context.options);
    const filename = context.filename;

    if (!isLintableFilename(filename)) {
      return {};
    }

    const program = getTypeScriptProgram(context);

    if (program === void 0) {
      return {};
    }

    const projectRoot = path.resolve(program.getCurrentDirectory());

    if (isPublicApiFile(filename, state, projectRoot)) {
      return {};
    }

    return {
      Program(node): void {
        const exportedElements = collectExportedElements(node.body);

        if (exportedElements.length === 0) {
          return;
        }

        for (const element of exportedElements) {
          const usageClassification = classifyExportUsage(
            collectCrossFileUsages(
              program,
              filename,
              state,
              projectRoot,
              element,
            ),
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
        publicApiFiles: [...DEFAULT_PUBLIC_API_FILES],
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
        "Export '{{exportedName}}' is never consumed by any file in the project; make it private by removing the export.",
      usedOnlyInTests:
        "Export '{{exportedName}}' is consumed only by test files; move it to the test file or a test utilities folder.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          publicApiFiles: {
            description: "File globs that define public API export surfaces.",
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
