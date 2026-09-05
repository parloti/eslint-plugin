import type { TSESTree } from "@typescript-eslint/utils";
import type { Rule } from "eslint";

import { getMockFactoryMatch } from "./rule-detection";
import { buildFixes } from "./rule-reporting";

/** Disallows casted `vi.mock` and `vi.doMock` factories. */
const noUnsafeVitestMockFactoryCastRule: Rule.RuleModule = {
  create: (context: Rule.RuleContext): Rule.RuleListener =>
    ({
      CallExpression(node): void {
        const match = getMockFactoryMatch(node as TSESTree.CallExpression);
        if (match === void 0) {
          return;
        }

        const fix = match.canAutofix
          ? (fixer: Rule.RuleFixer): Rule.Fix[] =>
              buildFixes(context, fixer, match)
          : void 0;

        context.report({
          ...(fix !== void 0 && { fix }),
          messageId: "noUnsafeVitestMockFactoryCast",
          node: match.node,
          ...(fix !== void 0 && {
            suggest: [{ fix, messageId: "replaceWithCreateMockProxy" }],
          }),
        });
      },
    }) satisfies Rule.RuleListener,
  meta: {
    docs: {
      description:
        "Disallow casted vi.mock and vi.doMock factories and prefer createMockProxy(...) for partial module mocks.",
      recommended: true,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/no-unsafe-vitest-mock-factory-cast.md",
    },
    fixable: "code",
    hasSuggestions: true,
    messages: {
      noUnsafeVitestMockFactoryCast:
        "Avoid casting vi.mock/vi.doMock factory results; use createMockProxy(...) with a type-only module import instead.",
      replaceWithCreateMockProxy:
        "Replace the casted factory with createMockProxy(...).",
    },
    schema: [],
    type: "problem",
  },
};

export { noUnsafeVitestMockFactoryCastRule };
