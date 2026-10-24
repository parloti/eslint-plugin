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
        const sourceFile = getProgramSourceFile(program, context.filename);

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

/** ESLint rule flagging public members unused by production code. */
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
        "Member '{{memberName}}' of '{{hostName}}' is never used by production code; remove it or make it private.",
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
