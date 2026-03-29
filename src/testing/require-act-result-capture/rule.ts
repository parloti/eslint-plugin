import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import { analyzeTestBlock, hasCapturableActResult } from "../aaa";

/**
 * Checks whether a call reports through `context.report(...)`.
 * @param expression Call expression to inspect.
 * @returns True when the call targets `context.report`.
 * @example
 * ```typescript
 * const matches = isContextReportCall({} as ESTree.CallExpression);
 * void matches;
 * ```
 */
function isContextReportCall(expression: ESTree.CallExpression): boolean {
  return (
    expression.callee.type === "MemberExpression" &&
    expression.callee.object.type === "Identifier" &&
    expression.callee.object.name === "context" &&
    expression.callee.property.type === "Identifier" &&
    expression.callee.property.name === "report"
  );
}

/**
 * Checks whether an Act statement is already delegated to a known helper.
 * @param statement Statement to inspect.
 * @returns True when the statement is handled by a helper wrapper.
 * @example
 * ```typescript
 * const handled = isHelperDrivenAct({} as ESTree.Statement);
 * void handled;
 * ```
 */
function isHelperDrivenAct(statement: ESTree.Statement): boolean {
  if (statement.type !== "ExpressionStatement") {
    return false;
  }

  const { expression } = statement;
  if (expression.type !== "CallExpression") {
    return false;
  }

  return (
    isContextReportCall(expression) ||
    isNamedHelperCall(expression) ||
    isRuleCreateCall(expression)
  );
}

/**
 * Checks whether a call targets one of the known Act helper wrappers.
 * @param expression Call expression to inspect.
 * @returns True when the helper name matches the allowlist.
 * @example
 * ```typescript
 * const matches = isNamedHelperCall({} as ESTree.CallExpression);
 * void matches;
 * ```
 */
function isNamedHelperCall(expression: ESTree.CallExpression): boolean {
  return (
    expression.callee.type === "Identifier" &&
    /^(?:report[A-Z]\w*|run(?:FunctionListener|Listener|Rule))$/u.test(
      expression.callee.name,
    )
  );
}

/**
 * Checks whether a call targets `*.Rule.create(...)`.
 * @param expression Call expression to inspect.
 * @returns True when the call targets a rule factory create method.
 * @example
 * ```typescript
 * const matches = isRuleCreateCall({} as ESTree.CallExpression);
 * void matches;
 * ```
 */
function isRuleCreateCall(expression: ESTree.CallExpression): boolean {
  return (
    expression.callee.type === "MemberExpression" &&
    expression.callee.object.type === "Identifier" &&
    expression.callee.object.name.endsWith("Rule") &&
    expression.callee.property.type === "Identifier" &&
    expression.callee.property.name === "create"
  );
}

/** Requires Act-phase expressions to capture non-void results before asserting. */
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
            statement.phases.includes("Act") &&
            !statement.phases.includes("Assert") &&
            !isHelperDrivenAct(statement.node) &&
            hasCapturableActResult(statement.node)
          ) {
            context.report({
              messageId: "captureActResult",
              node: statement.node,
            });
          }
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
