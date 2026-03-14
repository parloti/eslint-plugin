import type { Rule } from "eslint";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import { analyzeTestBlock, hasCapturableActResult } from "../aaa";

const requireActResultCaptureRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const analysis = analyzeTestBlock(context, node);
        if (analysis === void 0) {
          return;
        }

        for (const statement of analysis.statements) {
          if (
            statement.phase !== "Act" ||
            !hasCapturableActResult(statement.node)
          ) {
            continue;
          }

          context.report({
            messageId: "captureActResult",
            node: statement.node,
          });
        }
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: createRuleDocumentation(
      "require-act-result-capture",
      "Require non-void Act expressions to store the observed result before assertions.",
    ),
    messages: {
      captureActResult:
        "Capture the // Act result in a named variable before asserting on it.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { requireActResultCaptureRule };
