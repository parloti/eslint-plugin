import type * as ESTree from "estree";

import type { LocatedNode, TestBlockAnalysis } from "./types";

import {
  getAssertOperands,
  getExpectOperands,
  getIdentifierName,
  hasEvaluatedAssertionActual,
  isAssertionCall,
} from "./analyzer.assertions.operands";
import { visitNode } from "./analyzer.super.helpers";

/** Identifier names extracted from an assertion statement. */
interface AssertionIdentifiers {
  /** Identifier used as the actual value. */
  actual: string | undefined;
  /** Identifier used as the expected value. */
  expected: string | undefined;
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
 * Gets the outer assertion call expression for one statement when present.
 * @param statement Statement to inspect.
 * @returns Assertion call expression when the statement is expression-based.
 * @example
 * ```typescript
 * const expression = getAssertionExpression(statement);
 * void expression;
 * ```
 */
function getAssertionExpression(
  statement: ESTree.Statement,
): ESTree.CallExpression | undefined {
  if (statement.type !== "ExpressionStatement") {
    return void 0;
  }

  const expression = unwrapExpression(statement.expression);

  return expression?.type === "CallExpression" ? expression : void 0;
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
  let isAssertionFound = false;
  visitNode(statement, (node) => {
    if (node.type === "CallExpression" && isAssertionCall(node)) {
      isAssertionFound = true;
    }
  });
  return isAssertionFound;
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
    const assertionExpression = getAssertionExpression(statement);

    return (
      assertionExpression === void 0 ||
      !hasEvaluatedAssertionActual(assertionExpression, isActionExpression)
    );
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
  let current = expression;

  while (current?.type === "ChainExpression") {
    current = current.expression;
  }

  if (current?.type === "AwaitExpression") {
    return current.argument;
  }

  return current;
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

/** Companion marker for test isolation. */
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
