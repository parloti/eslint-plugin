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

/**
 * ESLint rule flagging exports that are unused or consumed only by test files.
 *
 * ### The Problem with Exporting for Testing Only
 * - **Breaks Encapsulation**: Exposing internal details pollutes your public API and makes it unclear what parts of the module are meant to be used by the rest of the application.
 * - **Ties Tests to Implementation**: If you test private functions directly, refactoring or renaming those internal functions will break your unit tests, even if the public behavior of the module remains unchanged.
 * - **Smell of Design Issues**: Needing to export a private function often means the module is doing too much and should be split into smaller, independent services or utility classes.
 *
 * ### Better Alternatives
 * - **Test Through Public Methods**: Write your tests against the public API (the functions or classes that are already exported and meant to be consumed). If the public methods work correctly, the internal helper functions are verified by extension.
 * - **Extract a Separate Helper Module**: If a private function is complex enough that it needs its own dedicated unit tests, extract it into its own separate module or utility file and export it properly from there.
 * - **Move to Test Utilities**: If the symbol is genuinely only needed for testing, move it to a test file or a dedicated test utilities folder.
 * @see {@link https://github.com/parloti/eslint-plugin/blob/main/docs/rules/no-unused-exports.md}
 */
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
        "Export '{{exportedName}}' is never consumed by any file in the project; remove the export or delete the symbol if it is no longer needed.",
      usedOnlyInTests:
        "Export '{{exportedName}}' is consumed only by test files. Avoid exporting for tests: test through the public API, extract to a separate helper module, or move to test utilities.",
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
