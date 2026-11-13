import type { Rule } from "eslint";

import { ESLintUtils } from "@typescript-eslint/utils";

import type { MemberUsageAdapter } from "./member-usage-utilities";

import {
  DEFAULT_PUBLIC_API_FILES,
  DEFAULT_TEST_FILE_PATTERNS,
  getOptions,
  isLintableFilename,
  isTestFile,
} from "../no-unused-exports/no-unused-exports-options";
import {
  collectUnusedPublicMembers,
  getProgramSourceFile,
  getProjectRoot,
} from "./member-utilities";

/**
 * Creates the rule listener with optional framework-specific member usage adapters.
 * @param usageAdapters Adapters that recognize uses outside TypeScript source.
 * @returns ESLint's create listener for the rule.
 * @example
 * ```typescript
 * const create = createNoUnusedPublicMembersListener();
 * ```
 */
const createNoUnusedPublicMembersListener =
  (
    usageAdapters: readonly MemberUsageAdapter[] = [],
  ): ((context: Rule.RuleContext) => Rule.RuleListener) =>
  (context): Rule.RuleListener => {
    if (!isLintableFilename(context.filename)) {
      return {};
    }

    let parserServices: ReturnType<typeof ESLintUtils.getParserServices>;

    try {
      parserServices = ESLintUtils.getParserServices(context as never);
    } catch {
      return {};
    }

    const program = parserServices.program;
    const state = getOptions(context.options);
    const projectRoot = getProjectRoot(program);

    if (isTestFile(context.filename, state, projectRoot)) {
      return {};
    }

    return {
      Program(): void {
        const sourceFile = getProgramSourceFile(
          program,
          context.filename,
          projectRoot,
        );

        if (sourceFile === void 0) {
          return;
        }

        for (const member of collectUnusedPublicMembers(
          sourceFile,
          program,
          state,
          projectRoot,
          parserServices,
          usageAdapters,
        )) {
          context.report({
            data: { hostName: member.hostName, memberName: member.memberName },
            messageId: "unusedPublicMember",
            node: member.reportNode,
          });
        }
      },
    };
  };

/**
 * ESLint rule flagging public members unused by production code unless their host is part of the public API.
 *
 * ### The Problem with Public Visibility for Testing Only
 * - **Breaks Encapsulation**: Exposing internal methods, properties, or state pollutes the class or type contract.
 * - **Ties Tests to Implementation**: If you test private functions or methods directly, refactoring or renaming those internal members will break your unit tests, even if the public behavior of the host remains unchanged.
 * - **Smell of Design Issues**: Needing to expose a private member often means the class or module is doing too much and should be split into smaller, independent services or collaborator classes.
 *
 * ### Better Alternatives
 * - **Test Through Public Methods**: Write your tests against the public methods of the class. If the public methods work correctly, internal helper methods are verified by extension.
 * - **Extract a Separate Service or Helper**: If a private method is complex enough that it needs its own dedicated unit tests, extract it into its own separate service, collaborator class, or utility module and export it properly from there.
 * - **Make Members Private or Protected**: Declare internal members as `private` (or `#private`) so the rule ignores them.
 * @see {@link https://github.com/parloti/eslint-plugin/blob/main/docs/rules/no-unused-public-members.md}
 */
const noUnusedPublicMembersRule: Rule.RuleModule = {
  create: createNoUnusedPublicMembersListener(),
  meta: {
    defaultOptions: [
      {
        publicApiFiles: [...DEFAULT_PUBLIC_API_FILES],
        testFilePatterns: [...DEFAULT_TEST_FILE_PATTERNS],
      },
    ],
    docs: {
      description:
        "Disallow public members that are unused by production code unless their host is part of the public API.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/no-unused-public-members.md",
    },
    messages: {
      unusedPublicMember:
        "Member '{{memberName}}' of '{{hostName}}' is never used by production code. Test through public methods, extract to a separate service/helper, or make it private.",
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
              "File globs treated as tests when classifying member consumers.",
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

export { createNoUnusedPublicMembersListener, noUnusedPublicMembersRule };
