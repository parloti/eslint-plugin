import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import { analyzeTestBlock, hasCapturableActResult } from "../aaa";

/**
 * @param statement
 * @example
 */
function isHelperDrivenAct(statement: ESTree.Statement): boolean {
  if (statement.type !== "ExpressionStatement") {
    return false;
  }

  const { expression } = statement;
  if (expression.type !== "CallExpression") {
    return false;
  }

  if (
    expression.callee.type === "MemberExpression" &&
    expression.callee.object.type === "Identifier" &&
    expression.callee.property.type === "Identifier" &&
    expression.callee.property.name === "create" &&
    expression.callee.object.name.endsWith("Rule")
  ) {
    return true;
  }

  if (
    expression.callee.type === "MemberExpression" &&
    expression.callee.object.type === "Identifier" &&
    expression.callee.object.name === "context" &&
    expression.callee.property.type === "Identifier" &&
    expression.callee.property.name === "report"
  ) {
    return true;
  }

  if (expression.callee.type !== "Identifier") {
    return false;
  }

  return /^(?:report[A-Z]\w*|run(?:FunctionListener|Listener|Rule))$/u.test(
    expression.callee.name,
  );
}

/**
 *
 */
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
            !statement.phases.includes("Act") ||
            statement.phases.includes("Assert") ||
            isHelperDrivenAct(statement.node) ||
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
