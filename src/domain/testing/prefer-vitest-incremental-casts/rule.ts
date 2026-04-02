import type { Rule } from "eslint";

import { ESLintUtils } from "@typescript-eslint/utils";

import type {
  MessageIds,
  Options,
  ParserServices,
  TypedRuleContext,
} from "./types";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import { collectMatch } from "./match";

/**
 * Resolves TypeScript parser services when the rule runs on a typed file.
 * @param context ESLint rule context.
 * @returns Parser services when TypeScript services are available.
 * @example
 * ```typescript
 * const services = getParserServices(context);
 * ```
 */
function getParserServices(
  context: TypedRuleContext,
): ParserServices | undefined {
  try {
    return ESLintUtils.getParserServices(context);
  } catch {
    return void 0;
  }
}

/** Enforces minimal nested casts for `vi.mock` and `vi.doMock` factory objects. */
const preferVitestIncrementalCastsRule = ESLintUtils.RuleCreator.withoutDocs<
  Options,
  MessageIds
>({
  create(context) {
    const services = getParserServices(context);

    if (services === void 0 || services.program === null) {
      return {};
    }

    const checker = services.program.getTypeChecker();
    const sourceText = context.sourceCode.text;

    return {
      CallExpression(node): void {
        const match = collectMatch({
          callExpression: node,
          checker,
          services,
          sourceText,
        });

        if (match === void 0) {
          return;
        }

        context.report({
          fix: (fixer) =>
            fixer.replaceTextRange(
              match.returnExpressionRange,
              match.replacementText,
            ),
          messageId: "preferVitestIncrementalCasts",
          node,
        });
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: createRuleDocumentation(
      "prefer-vitest-incremental-casts",
      "Prefer minimal nested casts in vi.mock/vi.doMock factory return objects when TypeScript rejects the module shape.",
    ),
    fixable: "code",
    messages: {
      preferVitestIncrementalCasts:
        "Normalize the mock factory to the smallest stable set of nested casts needed for the module type.",
    },
    schema: [],
    type: "suggestion",
  },
  name: "prefer-vitest-incremental-casts",
}) as unknown as Rule.RuleModule;

export { preferVitestIncrementalCastsRule };
