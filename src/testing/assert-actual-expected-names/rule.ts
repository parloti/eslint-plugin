import type { Rule } from "eslint";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import {
  analyzeTestBlock,
  getAssertDeclaredIdentifiers,
  getAssertionIdentifiers,
  hasAssertion,
  usesPrefix,
} from "../aaa";

const assertActualExpectedNamesRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const analysis = analyzeTestBlock(context, node);
        if (analysis === void 0) {
          return;
        }

        const declaredIdentifiers = getAssertDeclaredIdentifiers(analysis);
        const reportedNames = new Set<string>();

        for (const statement of analysis.statements) {
          if (
            !statement.phases.includes("Assert") ||
            !hasAssertion(statement.node)
          ) {
            continue;
          }

          const { actual, expected } = getAssertionIdentifiers(statement.node);

          if (
            actual !== void 0 &&
            declaredIdentifiers.has(actual) &&
            !usesPrefix(actual, "actual") &&
            !reportedNames.has(`actual:${actual}`)
          ) {
            reportedNames.add(`actual:${actual}`);
            context.report({
              data: { name: actual, prefix: "actual" },
              messageId: "missingPrefix",
              node: declaredIdentifiers.get(actual)!,
            });
          }

          if (
            expected !== void 0 &&
            declaredIdentifiers.has(expected) &&
            !usesPrefix(expected, "expected") &&
            !reportedNames.has(`expected:${expected}`)
          ) {
            reportedNames.add(`expected:${expected}`);
            context.report({
              data: { name: expected, prefix: "expected" },
              messageId: "missingPrefix",
              node: declaredIdentifiers.get(expected)!,
            });
          }
        }
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: createRuleDocumentation(
      "assert-actual-expected-names",
      "Require Assert-phase comparison variables to use actual*/expected* prefixes.",
    ),
    messages: {
      missingPrefix:
        "Rename '{{name}}' to use the '{{prefix}}' prefix when comparing values inside // Assert.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { assertActualExpectedNamesRule };
