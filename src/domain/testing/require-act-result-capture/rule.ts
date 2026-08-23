import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { ESLintUtils } from "@typescript-eslint/utils";
import * as ts from "typescript";

import { analyzeTestBlock } from "../aaa/analyzer.analysis";
import { hasCapturableActResult } from "../aaa/analyzer.classification.helpers";

/** Known helper wrappers whose return value is intentionally ignored in Act. */
const knownActHelpers = new Set([
  "runFunctionListener",
  "runListener",
  "runRule",
]);

/**
 * Gets the nearest identifier-like name from a member expression object.
 * @param object Member expression object node.
 * @returns Identifier-like name when it can be resolved statically.
 * @example
 * ```typescript
 * const name = getMemberObjectName({} as ESTree.MemberExpression["object"]);
 * void name;
 * ```
 */
function getMemberObjectName(
  object: ESTree.MemberExpression["object"],
): string | undefined {
  if (object.type === "Identifier") {
    return object.name;
  }

  if (
    object.type === "MemberExpression" &&
    object.property.type === "Identifier"
  ) {
    return object.property.name;
  }

  return void 0;
}

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
    knownActHelpers.has(expression.callee.name)
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
  if (
    expression.callee.type !== "MemberExpression" ||
    expression.callee.property.type !== "Identifier" ||
    expression.callee.property.name !== "create"
  ) {
    return false;
  }

  const objectName = getMemberObjectName(expression.callee.object);

  return objectName !== void 0 && objectName.endsWith("Rule");
}

/**
 * Checks whether a call's TypeScript return type is void.
 * @param context Rule context that may expose TypeScript parser services.
 * @param statement Act statement to inspect.
 * @returns True when the resolved return type is void; otherwise false.
 * @example
 * ```typescript
 * returnsVoid({} as Rule.RuleContext, {} as ESTree.Statement);
 * ```
 */
function returnsVoid(
  context: Rule.RuleContext,
  statement: ESTree.Statement,
): boolean {
  if (
    statement.type !== "ExpressionStatement" ||
    statement.expression.type !== "CallExpression"
  ) {
    return false;
  }

  try {
    const services = ESLintUtils.getParserServices(context as never);
    const typeNode = services.esTreeNodeToTSNodeMap.get(
      statement.expression as never,
    );
    const type = services.program.getTypeChecker().getTypeAtLocation(typeNode);

    return (type.flags & ts.TypeFlags.Void) !== 0;
  } catch {
    return false;
  }
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
            hasCapturableActResult(statement.node) &&
            !returnsVoid(context, statement.node)
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
    docs: {
      description:
        "Require non-void Act expressions to store the observed result before assertions.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/require-act-result-capture.md",
    },
    messages: {
      captureActResult:
        "Capture the // Act result in a named variable before asserting on it.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { requireActResultCaptureRule };
