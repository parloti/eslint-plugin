import {
  hasAsyncLogic as hasAsyncLogicImplementation,
  hasAwait as hasAwaitImplementation,
  hasBlankLineBeforeComment as hasBlankLineBeforeCommentImplementation,
  hasCapturableActResult as hasCapturableActResultImplementation,
  hasMutation as hasMutationImplementation,
  isMeaningfulActStatement as isMeaningfulActStatementImplementation,
  isSetupLikeStatement as isSetupLikeStatementImplementation,
} from "./analyzer.classification.helpers";

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

/** Checks whether a statement contains any async or await logic. */
const hasAsyncLogic = forward(hasAsyncLogicImplementation);

/** Checks whether a node contains an `await` expression. */
const hasAwait = forward(hasAwaitImplementation);

/** Checks whether there is a blank line immediately before a comment node. */
const hasBlankLineBeforeComment = forward(
  hasBlankLineBeforeCommentImplementation,
);

/** Checks whether an Act statement produces a result worth capturing. */
const hasCapturableActResult = forward(hasCapturableActResultImplementation);

/** Checks whether a statement performs an observable state mutation. */
const hasMutation = forward(hasMutationImplementation);

/** Checks whether a statement is a meaningful Act step (not setup or assertion). */
const isMeaningfulActStatement = forward(
  isMeaningfulActStatementImplementation,
);

/** Checks whether a statement looks like an Arrange-phase setup step. */
const isSetupLikeStatement = forward(isSetupLikeStatementImplementation);

export {
  hasAsyncLogic,
  hasAwait,
  hasBlankLineBeforeComment,
  hasCapturableActResult,
  hasMutation,
  isMeaningfulActStatement,
  isSetupLikeStatement,
};
