import type { Rule } from "eslint";
import type * as ESTree from "estree";

import type { LocatedComment, LocatedNode, TestBlockAnalysis } from "./types";

import {
  aaaPhaseOrder as aaaPhaseOrderImplementation,
  countActStatements as countActStatementsImplementation,
  getFlattenedSections as getFlattenedSectionsImplementation,
  getIndentationAtOffset as getIndentationAtOffsetImplementation,
  getLineStartRange as getLineStartRangeImplementation,
  getNewline as getNewlineImplementation,
  getPhaseBoundaryComments as getPhaseBoundaryCommentsImplementation,
  getSectionPhases as getSectionPhasesImplementation,
  getStatementPhases as getStatementPhasesImplementation,
  getSupportedTestCall as getSupportedTestCallImplementation,
} from "./analyzer.analysis.helpers";
import { isLocatedComment, isRangeWithin } from "./analyzer.super";

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

/** Ordered list of AAA phase names. */
const aaaPhaseOrder = aaaPhaseOrderImplementation;

/** Counts Act-phase statements in a test block analysis. */
const countActStatements = forward(countActStatementsImplementation);

/** Flattens multi-phase section comments into one entry per phase. */
const getFlattenedSections = forward(getFlattenedSectionsImplementation);

/** Resolves the leading whitespace for the line containing a source offset. */
const getIndentationAtOffset = forward(getIndentationAtOffsetImplementation);

/** Returns the start-of-line range for a given source offset. */
const getLineStartRange = forward(getLineStartRangeImplementation);

/** Detects the line-ending style used in a source text. */
const getNewline = forward(getNewlineImplementation);

/** Extracts the phase-boundary section comments from a test block analysis. */
const getPhaseBoundaryComments = forward(
  getPhaseBoundaryCommentsImplementation,
);

/** Parses AAA phase names from a section comment value. */
const getSectionPhases = forward(getSectionPhasesImplementation);

/** Resolves the AAA phases applicable to a statement. */
const getStatementPhases = forward(getStatementPhasesImplementation);

/** Extracts the test call and callback from a supported `it` or `test` call expression. */
const getSupportedTestCall = forward(getSupportedTestCallImplementation);

/**
 * Analyzes supported AAA test blocks.
 * @param context Input context value.
 * @param node Input node value.
 * @returns Return value output.
 * @example
 * ```typescript
 * analyzeTestBlock(context, node);
 * ```
 */
function analyzeTestBlock(
  context: Rule.RuleContext,
  node: ESTree.CallExpression,
): TestBlockAnalysis | undefined {
  const testCall = getSupportedTestCall(node);
  if (testCall === void 0) {
    return void 0;
  }

  const { callback, callExpression } = testCall;
  const { sourceCode } = context;
  const sectionComments: TestBlockAnalysis["sectionComments"] = sourceCode
    .getAllComments()
    .filter(
      (comment) =>
        isLocatedComment(comment) &&
        comment.type === "Line" &&
        isRangeWithin(comment.range, callback.body.range) &&
        getSectionPhases(comment.value).length > 0,
    )
    .map((comment) => ({
      comment: comment as LocatedComment,
      phases: getSectionPhases(comment.value),
    }));

  return {
    body: callback.body,
    bodyLineCount:
      callback.body.loc.end.line - callback.body.loc.start.line - 1,
    callExpression,
    newline: getNewline(sourceCode.text),
    sectionComments,
    sourceText: sourceCode.text,
    statements: callback.body.body.map((statement) => {
      const phases = getStatementPhases(statement, sectionComments);
      return {
        node: statement as LocatedNode<ESTree.Statement>,
        phase: phases.at(-1),
        phases,
      };
    }),
  };
}

export {
  aaaPhaseOrder,
  analyzeTestBlock,
  countActStatements,
  getFlattenedSections,
  getIndentationAtOffset,
  getLineStartRange,
  getPhaseBoundaryComments,
  getSectionPhases,
};
