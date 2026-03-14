import type { Rule } from "eslint";

import type { Comment, Example, Problem } from "./types";

import { checkExampleContent } from "./examples";
import { createFixer } from "./fixes";

/** Type definition for rule data. */
interface FixerLookupContext {
  /** Comment field value. */
  comment: Comment;

  /** Example field value. */
  example: Example;

  /** HasOtherExamples field value. */
  hasOtherExamples: boolean;

  /** Problem field value. */
  problem: Problem;

  /** SourceCode field value. */
  sourceCode: Rule.RuleContext["sourceCode"];
}

/** Type definition for rule data. */
interface ReportDescriptorContext {
  /** Comment field value. */
  comment: Comment;

  /** Example field value. */
  example: Example;

  /** HasOtherExamples field value. */
  hasOtherExamples: boolean;

  /** Problem field value. */
  problem: Problem;

  /** SourceCode field value. */
  sourceCode: Rule.RuleContext["sourceCode"];
}

/** Type definition for rule data. */
interface ReportExampleContext {
  /** Comment field value. */
  comment: Comment;

  /** Context field value. */
  context: Rule.RuleContext;

  /** Example field value. */
  example: Example;

  /** HasOtherExamples field value. */
  hasOtherExamples: boolean;
}

/** Type definition for rule data. */
interface ReportLocation {
  /** End field value. */
  end: {
    /** Column field value. */
    column: number;

    /** Line field value. */
    line: number;
  };

  /** Start field value. */
  start: {
    /** Column field value. */
    column: number;

    /** Line field value. */
    line: number;
  };
}

/**
 * Build a report descriptor for a single example problem.
 * @param context Input context value.
 * @returns Return value output.
 * @example
 * ```typescript
 * const descriptor = buildReportDescriptor({
 *   comment: { type: "Block", value: "*" } as Comment,
 *   example: {
 *     content: "",
 *     endIndex: 0,
 *     endOffset: 0,
 *     lineIndex: 0,
 *     prefix: " * ",
 *     startOffset: 0,
 *   },
 *   hasOtherExamples: false,
 *   problem: "missingFence",
 *   sourceCode: {} as Rule.SourceCode,
 * });
 * ```
 */
function buildReportDescriptor(
  context: ReportDescriptorContext,
): Rule.ReportDescriptor {
  const { comment, example, hasOtherExamples, problem, sourceCode } = context;
  const fix = getFixerForExample({
    comment,
    example,
    hasOtherExamples,
    problem,
    sourceCode,
  });
  const loc = getReportLocation(comment, example);

  if (loc !== void 0) {
    return {
      fix,
      loc,
      messageId: problem,
    };
  }

  return {
    fix,
    messageId: problem,
    node: sourceCode.ast as Rule.Node,
  };
}

/**
 * Resolve a fixer for the report when ranges are available.
 * @param context Input context value.
 * @returns Return value output.
 * @example
 * ```typescript
 * const fixer = getFixerForExample({
 *   comment: { type: "Block", value: "*" } as Comment,
 *   example: {
 *     content: "",
 *     endIndex: 0,
 *     endOffset: 0,
 *     lineIndex: 0,
 *     prefix: " * ",
 *     startOffset: 0,
 *   },
 *   hasOtherExamples: false,
 *   problem: "missingLanguage",
 *   sourceCode: {} as Rule.SourceCode,
 * });
 * ```
 */
function getFixerForExample(
  context: FixerLookupContext,
): ((fixer: Rule.RuleFixer) => null | Rule.Fix) | undefined {
  const { comment, example, hasOtherExamples, problem, sourceCode } = context;
  const commentOffset = comment.range?.[0];
  const commentValueOffset =
    typeof commentOffset === "number" ? commentOffset + 2 : void 0;
  const absoluteStart =
    typeof commentValueOffset === "number"
      ? commentValueOffset + example.startOffset
      : void 0;
  const absoluteEnd =
    typeof commentValueOffset === "number"
      ? commentValueOffset + example.endOffset
      : void 0;

  if (typeof absoluteStart !== "number" || typeof absoluteEnd !== "number") {
    return void 0;
  }

  return createFixer({
    absoluteEnd,
    absoluteStart,
    example,
    hasOtherExamples,
    problem,
    sourceText: sourceCode.text,
  });
}

/**
 * Resolve the report location for a matched example.
 * @param comment Comment node containing the example.
 * @param example Example metadata.
 * @returns Report location when available.
 * @example
 * ```typescript
 * const loc = getReportLocation({} as Comment, {
 *    content: "",
 *    endIndex: 0,
 *    endOffset: 0,
 *    lineIndex: 0,
 *    prefix: "",
 *    startOffset: 0,
 * });
 * ```
 */
function getReportLocation(
  comment: Comment,
  example: Example,
): ReportLocation | undefined {
  const line =
    typeof comment.loc?.start.line === "number"
      ? comment.loc.start.line + example.lineIndex
      : void 0;

  if (line === void 0) {
    return void 0;
  }

  return {
    end: { column: 1, line },
    start: { column: 0, line },
  };
}

/**
 * Reports a single example when it violates the rule.
 * @param context Report details for this example.
 * @example
 * ```typescript
 * reportExample(context);
 * ```
 */
function reportExample(context: ReportExampleContext): void {
  const { comment, context: ruleContext, example, hasOtherExamples } = context;
  const problem = checkExampleContent(example.content);

  if (problem === void 0) {
    return;
  }

  const descriptor = buildReportDescriptor({
    comment,
    example,
    hasOtherExamples,
    problem,
    sourceCode: ruleContext.sourceCode,
  });

  ruleContext.report(descriptor);
}

export { buildReportDescriptor, reportExample };
