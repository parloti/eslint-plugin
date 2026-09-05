import type { Rule } from "eslint";

import { buildFixes } from "./fix";
import { collectMatches } from "./match";

/** Enforce inline `vi.fn()` mocks inside `vi.mock`/`vi.doMock` factories. */
const preferViMockedImportRule: Rule.RuleModule = {
  create: (context: Rule.RuleContext): Rule.RuleListener =>
    ({
      Program: (): void => {
        const matches = collectMatches(context);

        if (matches.length === 0) {
          return;
        }

        for (const [index, match] of matches.entries()) {
          const fix =
            index === 0
              ? (fixer: Rule.RuleFixer): Rule.Fix[] =>
                  buildFixes(matches, fixer)
              : void 0;

          context.report({
            ...(fix !== void 0 && { fix }),
            messageId: "preferViMockedImport",
            node: match.node,
            ...(fix !== void 0 && {
              suggest: [{ fix, messageId: "inlineViMockedImport" }],
            }),
          });
        }
      },
    }) satisfies Rule.RuleListener,
  meta: {
    docs: {
      description:
        "Prefer inlining vi.fn mocks in vi.mock/vi.doMock factories and using vi.mocked(...).",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/prefer-vi-mocked-import.md",
    },
    fixable: "code",
    hasSuggestions: true,
    messages: {
      inlineViMockedImport:
        "Inline the vi.fn mocks and use vi.mocked(...) for calls.",
      preferViMockedImport:
        "Inline vi.fn mocks in the vi.mock/vi.doMock factory and use vi.mocked(...) for calls.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { preferViMockedImportRule };
