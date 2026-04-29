import type * as ESTree from "estree";

/** Raw assertion operands extracted from a call expression. */
interface AssertionOperands {
  /** Expression used as the actual operand. */
  actual: ESTree.Expression | undefined;
  /** Expression used as the expected operand. */
  expected: ESTree.Expression | undefined;
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
 * Checks whether an assertion evaluates the actual operand inline.
 * @param expression Assertion call expression to inspect.
 * @param isActionExpression Predicate that identifies action-like expressions.
 * @returns True when the assertion actual operand performs action-like work.
 * @example
 * ```typescript
 * const actual = hasEvaluatedAssertionActual(expression, () => true);
 * void actual;
 * ```
 */
function hasEvaluatedAssertionActual(
  expression: ESTree.CallExpression,
  isActionExpression: (expression: ESTree.Expression | undefined) => boolean,
): boolean {
  const operands =
    getExpectOperands(expression) ?? getAssertOperands(expression);

  return operands !== void 0 && isActionExpression(operands.actual);
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

/** Companion marker for test isolation. */
const analyzerAssertionsOperandsCompanion = true as const;

export {
  analyzerAssertionsOperandsCompanion,
  getAssertOperands,
  getExpectOperands,
  getIdentifierName,
  hasEvaluatedAssertionActual,
  isAssertionCall,
};
