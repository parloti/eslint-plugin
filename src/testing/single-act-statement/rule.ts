import type { Rule } from "eslint";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import { analyzeTestBlock, countActStatements } from "../aaa";

/**
 *
 */
const singleActStatementRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const analysis = analyzeTestBlock(context, node);
        if (analysis === void 0) {
          return;
        }

        const actStatementCount = countActStatements(analysis);
        if (actStatementCount <= 1) {
          return;
        }

        context.report({
          data: { count: String(actStatementCount) },
          messageId: "multipleActStatements",
          node: analysis.callExpression,
        });
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: createRuleDocumentation(
      "single-act-statement",
      "Require the // Act section to contain a single top-level statement or declaration.",
    ),
    messages: {
      multipleActStatements:
        "Reduce the // Act section to a single top-level statement or variable declaration; found {{count}}.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { singleActStatementRule };
