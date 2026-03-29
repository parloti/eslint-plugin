import type * as ESTree from "estree";

import type { SourceComment } from "./types";

import {
  getStatementExpression,
  hasAssertion,
  isActionExpression,
  unwrapExpression,
} from "./analyzer.assertions";
import {
  arrayMutationMethods,
  getExpressionName,
  getInvokedName,
  isCallableExpression,
  isLocatedComment,
  isUtilityConstructor,
  isUtilityNamedCall,
  isUtilityNamespaceCall,
  visitNode,
  voidLikeMethodNames,
  voidLikeNamePattern,
} from "./analyzer.super";

/**
 * Checks for async logic.
 * @param statement Input statement value.
 * @returns Return value output.
 * @example
 * ```typescript
 * hasAsyncLogic(statement);
 * ```
 */
function hasAsyncLogic(statement: ESTree.Statement): boolean {
  let foundAsyncLogic = false;

  visitNode(statement, (node) => {
    if (node.type === "AwaitExpression") {
      foundAsyncLogic = true;
      return;
    }

    if (
      node.type === "CallExpression" &&
      node.callee.type === "MemberExpression" &&
      node.callee.property.type === "Identifier" &&
      ["catch", "finally", "then"].includes(node.callee.property.name)
    ) {
      foundAsyncLogic = true;
      return;
    }

    if (
      node.type === "NewExpression" &&
      getExpressionName(node.callee) === "Promise"
    ) {
      foundAsyncLogic = true;
    }
  });

  return foundAsyncLogic;
}

/**
 * Checks for await usage.
 * @param statement Input statement value.
 * @returns Return value output.
 * @example
 * ```typescript
 * hasAwait(statement);
 * ```
 */
function hasAwait(statement: ESTree.Statement): boolean {
  let foundAwait = false;

  visitNode(statement, (node) => {
    if (node.type === "AwaitExpression") {
      foundAwait = true;
    }
  });

  return foundAwait;
}

/**
 * Checks for blank lines before comments.
 * @param sourceText Input sourceText value.
 * @param comment Input comment value.
 * @returns Return value output.
 * @example
 * ```typescript
 * hasBlankLineBeforeComment(sourceText, comment);
 * ```
 */
function hasBlankLineBeforeComment(
  sourceText: string,
  comment: SourceComment,
): boolean {
  if (!isLocatedComment(comment)) {
    return true;
  }

  const lines = sourceText.split(/\r\n|\n/u);
  const previousLine = lines[comment.loc.start.line - 2];

  return previousLine === void 0 || previousLine.trim().length === 0;
}

/**
 * Checks for capturable Act results.
 * @param statement Input statement value.
 * @returns Return value output.
 * @example
 * ```typescript
 * hasCapturableActResult(statement);
 * ```
 */
function hasCapturableActResult(statement: ESTree.Statement): boolean {
  if (statement.type !== "ExpressionStatement") {
    return false;
  }

  const expression = unwrapExpression(statement.expression);
  if (!isActionExpression(expression) || isUtilityLikeExpression(expression)) {
    return false;
  }

  const calleeName = getInvokedName(
    expression as ESTree.CallExpression | ESTree.NewExpression,
  );

  return (
    calleeName === void 0 ||
    (!voidLikeMethodNames.has(calleeName) &&
      !voidLikeNamePattern.test(calleeName))
  );
}

/**
 * Checks for mutation.
 * @param statement Input statement value.
 * @returns Return value output.
 * @example
 * ```typescript
 * hasMutation(statement);
 * ```
 */
function hasMutation(statement: ESTree.Statement): boolean {
  let foundMutation = false;

  visitNode(statement, (node) => {
    if (
      node.type === "AssignmentExpression" ||
      node.type === "UpdateExpression" ||
      node.type === "UnaryExpression"
    ) {
      if (node.type !== "UnaryExpression" || node.operator === "delete") {
        foundMutation = true;
      }

      return;
    }

    if (
      node.type === "CallExpression" &&
      node.callee.type === "MemberExpression" &&
      node.callee.property.type === "Identifier" &&
      arrayMutationMethods.has(node.callee.property.name)
    ) {
      foundMutation = true;
    }
  });

  return foundMutation;
}

/**
 * Checks for meaningful Act statements.
 * @param statement Input statement value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isMeaningfulActStatement(statement);
 * ```
 */
function isMeaningfulActStatement(statement: ESTree.Statement): boolean {
  const expression = getStatementExpression(statement);
  if (expression === void 0) {
    return false;
  }

  return (
    isActionExpression(expression) &&
    !isUtilityLikeExpression(expression) &&
    !hasAssertion(statement)
  );
}

/**
 * Checks for rule create calls.
 * @param expression Input expression value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isRuleCreateInvocation(expression);
 * ```
 */
function isRuleCreateInvocation(
  expression: ESTree.CallExpression | ESTree.NewExpression,
): boolean {
  return (
    expression.type === "CallExpression" &&
    expression.callee.type === "MemberExpression" &&
    expression.callee.object.type === "Identifier" &&
    expression.callee.property.type === "Identifier" &&
    expression.callee.property.name === "create" &&
    expression.callee.object.name.endsWith("Rule")
  );
}

/**
 * Checks for setup-like statements.
 * @param statement Input statement value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isSetupLikeStatement(statement);
 * ```
 */
function isSetupLikeStatement(statement: ESTree.Statement): boolean {
  if (statement.type === "VariableDeclaration") {
    return statement.declarations.every((declaration) => {
      if (declaration.init === null) {
        return true;
      }

      const init = unwrapExpression(declaration.init);

      return !isActionExpression(init) || isUtilityLikeExpression(init);
    });
  }

  const expression = getStatementExpression(statement);

  return expression !== void 0 && isUtilityLikeExpression(expression);
}

/**
 * Checks for utility-like expressions.
 * @param expression Input expression value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isUtilityLikeExpression(expression);
 * ```
 */
function isUtilityLikeExpression(
  expression: ESTree.Expression | undefined,
): boolean {
  const unwrappedExpression = unwrapExpression(expression);
  if (!isCallableExpression(unwrappedExpression)) {
    return false;
  }

  const calleeName = getExpressionName(unwrappedExpression.callee);
  if (calleeName === void 0) {
    return false;
  }

  return (
    !isRuleCreateInvocation(unwrappedExpression) &&
    (isUtilityConstructor(unwrappedExpression, calleeName) ||
      isUtilityNamedCall(calleeName) ||
      isUtilityNamespaceCall(unwrappedExpression))
  );
}

export {
  hasAsyncLogic,
  hasAwait,
  hasBlankLineBeforeComment,
  hasCapturableActResult,
  hasMutation,
  isMeaningfulActStatement,
  isSetupLikeStatement,
};
