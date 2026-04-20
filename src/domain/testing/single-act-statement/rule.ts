import type { Rule } from "eslint";

import { analyzeTestBlock, countActStatements } from "../aaa";

/** Requires the Act phase to contain a single top-level statement. */
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
    docs: {
      description:
        "Require the // Act section to contain a single top-level statement or declaration.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/single-act-statement.md",
    },
    messages: {
      multipleActStatements:
        "Reduce the // Act section to a single top-level statement or variable declaration; found {{count}}.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { singleActStatementRule };
