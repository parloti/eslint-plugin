import type * as ESTree from "estree";

import type { SourceComment } from "./types";

import {
  getStatementExpression,
  hasAssertion,
  isActionExpression,
  unwrapExpression,
} from "./analyzer.assertions.helpers";
import { visitStatementWithoutDeferredBodies } from "./analyzer.classification.traversal";
import {
  arrayMutationMethods,
  getExpressionName,
  getInvokedName,
  isCallableExpression,
  isLocatedComment,
  isUtilityConstructor,
  isUtilityNamedCall,
  isUtilityNamespaceCall,
  isVoidLikeMethodName,
  voidLikeMethodNames,
} from "./analyzer.super";
import { visitNode } from "./analyzer.super.helpers";

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
  let wasAsyncLogicFound = false;
  visitStatementWithoutDeferredBodies(statement, (node) => {
    if (node.type === "AwaitExpression") {
      wasAsyncLogicFound = true;
      return;
    }
    if (
      node.type === "CallExpression" &&
      node.callee.type === "MemberExpression" &&
      node.callee.property.type === "Identifier" &&
      ["catch", "finally", "then"].includes(node.callee.property.name)
    ) {
      wasAsyncLogicFound = true;
      return;
    }
    if (
      node.type === "NewExpression" &&
      getExpressionName(node.callee) === "Promise"
    ) {
      wasAsyncLogicFound = true;
    }
  });
  return wasAsyncLogicFound;
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
  let wasAwaitFound = false;
  visitStatementWithoutDeferredBodies(statement, (node) => {
    if (node.type === "AwaitExpression") {
      wasAwaitFound = true;
    }
  });
  return wasAwaitFound;
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
    (!voidLikeMethodNames.has(calleeName) && !isVoidLikeMethodName(calleeName))
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
  let wasMutationFound = false;
  visitNode(statement, (node) => {
    if (
      ["AssignmentExpression", "UnaryExpression", "UpdateExpression"].includes(
        node.type,
      )
    ) {
      if (node.type !== "UnaryExpression" || node.operator === "delete") {
        wasMutationFound = true;
      }
      return;
    }
    if (
      node.type === "CallExpression" &&
      node.callee.type === "MemberExpression" &&
      node.callee.property.type === "Identifier" &&
      arrayMutationMethods.has(node.callee.property.name)
    ) {
      wasMutationFound = true;
    }
  });
  return wasMutationFound;
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
  if (hasAssertion(statement)) {
    return false;
  }
  if (isActionExpression(expression)) {
    if (
      statement.type === "VariableDeclaration" &&
      expression.type === "NewExpression"
    ) {
      return false;
    }
    return !isUtilityLikeExpression(expression);
  }
  if (
    statement.type !== "VariableDeclaration" ||
    expression.type !== "ObjectExpression"
  ) {
    return false;
  }

  let hasMeaningfulAction = false;
  visitStatementWithoutDeferredBodies(statement, (node) => {
    if (
      (node.type === "CallExpression" || node.type === "NewExpression") &&
      !isUtilityLikeExpression(node)
    ) {
      hasMeaningfulAction = true;
    }
  });
  return hasMeaningfulAction;
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
      if (init === void 0) {
        return true;
      }
      if (init.type === "NewExpression") {
        return true;
      }
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
