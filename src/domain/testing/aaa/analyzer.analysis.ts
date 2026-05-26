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

/** Source comment shape returned by ESLint for one file. */
type AnalyzerComment = ReturnType<
  Rule.RuleContext["sourceCode"]["getAllComments"]
>[number];

/** ESLint source-code service reference used for comment caching. */
type AnalyzerSourceCode = Rule.RuleContext["sourceCode"];

/** Memoized comment arrays keyed by ESLint source-code instances. */
const sourceCommentsCache = new WeakMap<
  AnalyzerSourceCode,
  readonly AnalyzerComment[]
>();

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
  const sectionComments: TestBlockAnalysis["sectionComments"] =
    getSourceComments(sourceCode)
      .filter(
        (comment) =>
          isLocatedComment(comment) &&
          comment.type === "Line" &&
          isRangeWithin(comment.range, callback.body.range) &&
          !isInsideTopLevelStatement(comment, callback.body.body) &&
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

/**
 * Returns cached source comments for the active file.
 * @param sourceCode Input sourceCode value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getSourceComments(sourceCode);
 * ```
 */
function getSourceComments(
  sourceCode: AnalyzerSourceCode,
): readonly AnalyzerComment[] {
  const cachedComments = sourceCommentsCache.get(sourceCode);
  if (cachedComments !== void 0) {
    return cachedComments;
  }

  const loadedComments = sourceCode.getAllComments();
  sourceCommentsCache.set(sourceCode, loadedComments);

  return loadedComments;
}

/**
 * Checks whether a comment is nested inside one top-level statement range.
 * @param comment Input comment value.
 * @param statements Input statements value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isInsideTopLevelStatement(comment, statements);
 * ```
 */
function isInsideTopLevelStatement(
  comment: LocatedComment,
  statements: readonly ESTree.Statement[],
): boolean {
  const commentLine = comment.loc.start.line;

  return statements.some((statement) => {
    const statementStartLine = statement.loc?.start.line;
    const statementEndLine = statement.loc?.end.line;

    if (statementStartLine === void 0 || statementEndLine === void 0) {
      return false;
    }

    return commentLine >= statementStartLine && commentLine <= statementEndLine;
  });
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
