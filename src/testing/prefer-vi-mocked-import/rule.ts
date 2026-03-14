import type { Rule } from "eslint";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import { buildFix } from "./fix";
import { collectMatch } from "./match";

/** Enforce inline `vi.fn()` mocks inside `vi.mock`/`vi.doMock` factories. */
const preferViMockedImportRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      Program: (): void => {
        const match = collectMatch(context);

        if (match === void 0) {
          return;
        }

        context.report({
          fix: (fixer: Rule.RuleFixer): Rule.Fix[] => buildFix(match, fixer),
          messageId: "preferViMockedImport",
          node: match.node,
        });
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: createRuleDocumentation(
      "prefer-vi-mocked-import",
      "Prefer inlining vi.fn mocks in vi.mock/vi.doMock factories and using vi.mocked(...).",
    ),
    fixable: "code",
    messages: {
      preferViMockedImport:
        "Inline vi.fn mocks in the vi.mock/vi.doMock factory and use vi.mocked(...) for calls.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { preferViMockedImportRule };
