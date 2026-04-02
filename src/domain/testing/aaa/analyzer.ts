import {
  aaaPhaseOrder as aaaPhaseOrderImplementation,
  analyzeTestBlock as analyzeTestBlockImplementation,
  countActStatements as countActStatementsImplementation,
  getFlattenedSections as getFlattenedSectionsImplementation,
  getIndentationAtOffset as getIndentationAtOffsetImplementation,
  getLineStartRange as getLineStartRangeImplementation,
  getPhaseBoundaryComments as getPhaseBoundaryCommentsImplementation,
  getSectionPhases as getSectionPhasesImplementation,
} from "./analyzer.analysis";
import {
  getAssertDeclaredIdentifiers as getAssertDeclaredIdentifiersImplementation,
  getAssertionIdentifiers as getAssertionIdentifiersImplementation,
  hasAssertion as hasAssertionImplementation,
  isValidAssertStatement as isValidAssertStatementImplementation,
  usesPrefix as usesPrefixImplementation,
} from "./analyzer.assertions";
import {
  hasAsyncLogic as hasAsyncLogicImplementation,
  hasAwait as hasAwaitImplementation,
  hasBlankLineBeforeComment as hasBlankLineBeforeCommentImplementation,
  hasCapturableActResult as hasCapturableActResultImplementation,
  hasMutation as hasMutationImplementation,
  isMeaningfulActStatement as isMeaningfulActStatementImplementation,
  isSetupLikeStatement as isSetupLikeStatementImplementation,
} from "./analyzer.classification";

/** Canonical ordering used when comparing AAA phases. */
const aaaPhaseOrder = aaaPhaseOrderImplementation;

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

/** Analyzes a supported `it` or `test` callback for AAA sections. */
const analyzeTestBlock = forward(analyzeTestBlockImplementation);

/** Counts statement forms that should be treated as Act steps. */
const countActStatements = forward(countActStatementsImplementation);

/** Collects identifiers declared inside Assert sections. */
const getAssertDeclaredIdentifiers = forward(
  getAssertDeclaredIdentifiersImplementation,
);

/** Extracts `actual` and `expected` identifiers from assertion statements. */
const getAssertionIdentifiers = forward(getAssertionIdentifiersImplementation);

/** Flattens section comments into one entry per resolved phase. */
const getFlattenedSections = forward(getFlattenedSectionsImplementation);

/** Returns the indentation prefix that appears before a given offset. */
const getIndentationAtOffset = forward(getIndentationAtOffsetImplementation);

/** Resolves the starting range for a specific source line. */
const getLineStartRange = forward(getLineStartRangeImplementation);

/** Filters section comments down to phase boundaries that matter after Arrange. */
const getPhaseBoundaryComments = forward(
  getPhaseBoundaryCommentsImplementation,
);

/** Parses AAA phases from a section comment value. */
const getSectionPhases = forward(getSectionPhasesImplementation);

/** Detects whether a statement contains any assertion call. */
const hasAssertion = forward(hasAssertionImplementation);

/** Detects asynchronous behavior such as awaits, promise chains, and promises. */
const hasAsyncLogic = forward(hasAsyncLogicImplementation);

/** Detects whether a statement contains an `await` expression. */
const hasAwait = forward(hasAwaitImplementation);

/** Checks whether a section comment is separated by a blank line. */
const hasBlankLineBeforeComment = forward(
  hasBlankLineBeforeCommentImplementation,
);

/** Detects Act expressions whose result should usually be captured. */
const hasCapturableActResult = forward(hasCapturableActResultImplementation);

/** Detects mutation-oriented statements and array mutator calls. */
const hasMutation = forward(hasMutationImplementation);

/** Detects statements that represent meaningful Act steps. */
const isMeaningfulActStatement = forward(
  isMeaningfulActStatementImplementation,
);

/** Detects statements that should stay in Arrange as setup helpers. */
const isSetupLikeStatement = forward(isSetupLikeStatementImplementation);

/** Detects whether a statement shape is valid inside Assert. */
const isValidAssertStatement = forward(isValidAssertStatementImplementation);

/** Checks whether an identifier matches the expected AAA naming prefix. */
const usesPrefix = forward(usesPrefixImplementation);

export {
  aaaPhaseOrder,
  analyzeTestBlock,
  countActStatements,
  getAssertDeclaredIdentifiers,
  getAssertionIdentifiers,
  getFlattenedSections,
  getIndentationAtOffset,
  getLineStartRange,
  getPhaseBoundaryComments,
  getSectionPhases,
  hasAssertion,
  hasAsyncLogic,
  hasAwait,
  hasBlankLineBeforeComment,
  hasCapturableActResult,
  hasMutation,
  isMeaningfulActStatement,
  isSetupLikeStatement,
  isValidAssertStatement,
  usesPrefix,
};
