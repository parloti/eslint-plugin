/* eslint max-lines: ["error", 340] -- Mandatory multiline JSDoc for internal helpers pushes this split file over the default limit. */

import type * as ESTree from "estree";

import type { LocatedNode, TestBlockAnalysis } from "./types";

import { visitNode } from "./analyzer.super";

/** Identifier names extracted from an assertion statement. */
interface AssertionIdentifiers {
  /** Identifier used as the actual value. */
  actual: string | undefined;
  /** Identifier used as the expected value. */
  expected: string | undefined;
}

/** Raw assertion operands extracted from a call expression. */
interface AssertionOperands {
  /** Expression used as the actual operand. */
  actual: ESTree.Expression | undefined;
  /** Expression used as the expected operand. */
  expected: ESTree.Expression | undefined;
}

/**
 * Collects Assert declarations.
 * @param analysis Input analysis value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getAssertDeclaredIdentifiers(analysis);
 * ```
 */
function getAssertDeclaredIdentifiers(
  analysis: TestBlockAnalysis,
): Map<string, LocatedNode<ESTree.Identifier>> {
  const declaredIdentifiers = new Map<string, LocatedNode<ESTree.Identifier>>();
  for (const statement of analysis.statements) {
    if (
      statement.phases.includes("Assert") &&
      statement.node.type === "VariableDeclaration"
    ) {
      for (const declaration of statement.node.declarations) {
        if (declaration.id.type === "Identifier") {
          declaredIdentifiers.set(
            declaration.id.name,
            declaration.id as LocatedNode<ESTree.Identifier>,
          );
        }
      }
    }
  }
  return declaredIdentifiers;
}

/**
 * Extracts assertion identifiers.
 * @param statement Input statement value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getAssertionIdentifiers(statement);
 * ```
 */
function getAssertionIdentifiers(
  statement: ESTree.Statement,
): AssertionIdentifiers {
  if (statement.type !== "ExpressionStatement") {
    return { actual: void 0, expected: void 0 };
  }
  const expression = unwrapExpression(statement.expression);
  if (expression?.type !== "CallExpression") {
    return { actual: void 0, expected: void 0 };
  }

  const expectOperands = getExpectOperands(expression);
  if (expectOperands !== void 0) {
    return {
      actual: getIdentifierName(expectOperands.actual),
      expected: getIdentifierName(expectOperands.expected),
    };
  }
  const assertOperands = getAssertOperands(expression);
  return {
    actual: getIdentifierName(assertOperands?.actual),
    expected: getIdentifierName(assertOperands?.expected),
  };
}

/**
 * Gets assert operands.
 * @param expression Input expression value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getAssertOperands(expression);
 * ```
 */
function getAssertOperands(
  expression: ESTree.CallExpression,
): AssertionOperands | undefined {
  if (
    expression.callee.type === "MemberExpression" &&
    expression.callee.object.type === "Identifier" &&
    expression.callee.object.name === "assert"
  ) {
    const [actual, expected] = expression.arguments;
    if (
      actual?.type !== "SpreadElement" &&
      expected?.type !== "SpreadElement"
    ) {
      return { actual, expected };
    }
  }
  return void 0;
}

/**
 * Gets expect operands.
 * @param expression Input expression value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getExpectOperands(expression);
 * ```
 */
function getExpectOperands(
  expression: ESTree.CallExpression,
): AssertionOperands | undefined {
  if (
    expression.callee.type === "Identifier" &&
    expression.callee.name === "expect"
  ) {
    const [actual] = expression.arguments;
    return actual?.type === "SpreadElement"
      ? { actual: void 0, expected: void 0 }
      : { actual, expected: void 0 };
  }

  if (
    expression.callee.type === "MemberExpression" &&
    expression.callee.object.type === "CallExpression"
  ) {
    const nestedOperands = getExpectOperands(expression.callee.object);
    if (nestedOperands === void 0) {
      return void 0;
    }
    const [expected] = expression.arguments;
    return expected?.type === "SpreadElement"
      ? nestedOperands
      : { actual: nestedOperands.actual, expected };
  }
  return void 0;
}

/**
 * Gets an identifier name.
 * @param expression Input expression value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getIdentifierName(expression);
 * ```
 */
function getIdentifierName(
  expression: ESTree.Expression | undefined,
): string | undefined {
  return expression?.type === "Identifier" ? expression.name : void 0;
}

/**
 * Gets a statement expression.
 * @param statement Input statement value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getStatementExpression(statement);
 * ```
 */
function getStatementExpression(
  statement: ESTree.Statement,
): ESTree.Expression | undefined {
  if (statement.type === "ExpressionStatement") {
    return statement.expression;
  }
  if (
    statement.type === "VariableDeclaration" &&
    statement.declarations.length === 1
  ) {
    const [declaration] = statement.declarations;
    return declaration?.init as ESTree.Expression | undefined;
  }
  return void 0;
}

/**
 * Checks for assertions.
 * @param statement Input statement value.
 * @returns Return value output.
 * @example
 * ```typescript
 * hasAssertion(statement);
 * ```
 */
function hasAssertion(statement: ESTree.Statement): boolean {
  let foundAssertion = false;
  visitNode(statement, (node) => {
    if (node.type === "CallExpression" && isAssertionCall(node)) {
      foundAssertion = true;
    }
  });
  return foundAssertion;
}

/**
 * Checks for action expressions.
 * @param expression Input expression value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isActionExpression(expression);
 * ```
 */
function isActionExpression(
  expression: ESTree.Expression | undefined,
): boolean {
  const unwrappedExpression = unwrapExpression(expression);
  return (
    unwrappedExpression?.type === "AwaitExpression" ||
    unwrappedExpression?.type === "CallExpression" ||
    unwrappedExpression?.type === "NewExpression"
  );
}

/**
 * Checks for assertion calls.
 * @param node Input node value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isAssertionCall(node);
 * ```
 */
function isAssertionCall(node: ESTree.CallExpression): boolean {
  if (node.callee.type === "Identifier") {
    return node.callee.name === "expect" || node.callee.name === "assert";
  }
  if (node.callee.type !== "MemberExpression") {
    return false;
  }
  if (
    node.callee.object.type === "Identifier" &&
    node.callee.object.name === "assert"
  ) {
    return true;
  }
  return (
    node.callee.object.type === "CallExpression" &&
    isAssertionCall(node.callee.object)
  );
}

/**
 * Checks Assert statement validity.
 * @param statement Input statement value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isValidAssertStatement(statement);
 * ```
 */
function isValidAssertStatement(statement: ESTree.Statement): boolean {
  if (hasAssertion(statement)) {
    return true;
  }
  if (statement.type !== "VariableDeclaration") {
    return false;
  }

  return statement.declarations.every((declaration) => {
    if (declaration.init === null) {
      return true;
    }
    return !isActionExpression(unwrapExpression(declaration.init));
  });
}

/**
 * Unwraps nested expressions.
 * @param expression Input expression value.
 * @returns Return value output.
 * @example
 * ```typescript
 * unwrapExpression(expression);
 * ```
 */
function unwrapExpression(
  expression: ESTree.Expression | undefined,
): ESTree.Expression | undefined {
  if (expression?.type === "ChainExpression") {
    return unwrapExpression(expression.expression);
  }
  if (expression?.type === "AwaitExpression") {
    return expression.argument;
  }
  return expression;
}

/**
 * Checks AAA naming prefixes.
 * @param name Input name value.
 * @param prefix Input prefix value.
 * @returns Return value output.
 * @example
 * ```typescript
 * usesPrefix("actualResult", "actual");
 * ```
 */
function usesPrefix(name: string, prefix: "actual" | "expected"): boolean {
  return name === prefix || name.startsWith(prefix);
}

export {
  getAssertDeclaredIdentifiers,
  getAssertionIdentifiers,
  getStatementExpression,
  hasAssertion,
  isActionExpression,
  isValidAssertStatement,
  unwrapExpression,
  usesPrefix,
};
export type { AssertionIdentifiers };
