import {
  getAssertDeclaredIdentifiers as getAssertDeclaredIdentifiersImplementation,
  getAssertionIdentifiers as getAssertionIdentifiersImplementation,
  getStatementExpression as getStatementExpressionImplementation,
  hasAssertion as hasAssertionImplementation,
  isActionExpression as isActionExpressionImplementation,
  isValidAssertStatement as isValidAssertStatementImplementation,
  unwrapExpression as unwrapExpressionImplementation,
  usesPrefix as usesPrefixImplementation,
} from "./analyzer.assertions.helpers";

/**
 * Creates a local forwarding function for an imported analyzer helper.
 * @template TParameters Forwarded parameter tuple.
 * @template TResult Forwarded return type.
 * @param implementation Imported helper implementation.
 * @returns Local function that forwards all arguments to the implementation.
 * @example
 * ```typescript
 * const localHelper = forward(implementation);
 * ```
 */
function forward<TParameters extends unknown[], TResult>(
  implementation: (...parameters: TParameters) => TResult,
): (...parameters: TParameters) => TResult {
  return (...parameters) => implementation(...parameters);
}

/** Collects all declared identifiers from an assert statement. */
const getAssertDeclaredIdentifiers = forward(
  getAssertDeclaredIdentifiersImplementation,
);

/** Resolves the identifier names used in an assertion call. */
const getAssertionIdentifiers = forward(getAssertionIdentifiersImplementation);

/** Extracts the expression from an expression statement node. */
const getStatementExpression = forward(getStatementExpressionImplementation);

/** Checks whether a statement contains an assertion call. */
const hasAssertion = forward(hasAssertionImplementation);

/** Checks whether an expression is an Act-phase action expression. */
const isActionExpression = forward(isActionExpressionImplementation);

/** Checks whether a statement is a valid Assert-phase assertion. */
const isValidAssertStatement = forward(isValidAssertStatementImplementation);

/** Unwraps a nested or chained expression to its root call. */
const unwrapExpression = forward(unwrapExpressionImplementation);

/** Checks whether an assertion call uses a known assertion prefix. */
const usesPrefix = forward(usesPrefixImplementation);

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
