import type { Rule } from "eslint";

import type { TestBlockAnalysis } from "../../aaa/types";

import { updateSectionOrder } from "../rule-section-reporting";

/** Context plus captured report descriptors for one reporting run. */
interface CapturedReports {
  /** Mock ESLint rule context that records reports. */
  context: Rule.RuleContext;

  /** Message identifiers captured from context.report. */
  messageIds: string[];
}

/**
 * Builds a rule context that records reported message identifiers.
 * @returns Context and its captured message identifier list.
 * @example
 * ```typescript
 * const { context, messageIds } = createRecordingContext();
 * ```
 */
const createRecordingContext = (): CapturedReports => {
  const messageIds: string[] = [];
  const context = {
    report: (descriptor: Rule.ReportDescriptor): void => {
      if ("messageId" in descriptor) {
        messageIds.push(descriptor.messageId);
      }
    },
  } as unknown as Rule.RuleContext;

  return { context, messageIds };
};

/**
 * Creates one section comment fixture placed at the given line.
 * @param phases AAA phases declared by the marker.
 * @param line One-based source line of the marker.
 * @returns Section comment fixture for analysis inputs.
 * @example
 * ```typescript
 * const sectionComment = createSectionCommentFixture(["Arrange"], 2);
 * ```
 */
const createSectionCommentFixture = (
  phases: string[],
  line: number,
): TestBlockAnalysis["sectionComments"][number] =>
  ({
    comment: {
      loc: { end: { column: 2, line }, start: { column: 2, line } },
      range: [line * 10, line * 10 + 8],
      type: "Line",
      value: `// ${phases.join(" & ")}`,
    },
    phases,
  }) as never;

/**
 * Creates one statement fixture located at the given line.
 * @param phases AAA phases active for the statement.
 * @param line One-based source line of the statement.
 * @returns Statement fixture for analysis inputs.
 * @example
 * ```typescript
 * const statement = createStatementFixture(["Arrange"], 3);
 * ```
 */
const createStatementFixture = (
  phases: string[],
  line: number,
): TestBlockAnalysis["statements"][number] =>
  ({
    node: {
      loc: { end: { column: 0, line }, start: { column: 0, line } },
      range: [line * 10, line * 10 + 4],
      type: "VariableDeclaration",
    },
    phase: phases.at(-1),
    phases,
  }) as never;

/**
 * Creates a minimal analysis fixture for the reporting helpers.
 * @param sectionComments Section markers included in the block.
 * @param statements Statements included in the block.
 * @returns Analysis fixture accepted by the reporting helpers.
 * @example
 * ```typescript
 * const analysis = createAnalysisFixture([], []);
 * ```
 */
const createAnalysisFixture = (
  sectionComments: TestBlockAnalysis["sectionComments"],
  statements: TestBlockAnalysis["statements"],
): TestBlockAnalysis =>
  ({
    bodyLineCount: 6,
    callExpression: { type: "CallExpression" },
    newline: "\n",
    sectionComments,
    sourceText: "",
    statements,
  }) as never;

/**
 * Creates one updateSectionOrder run backed by a recording context.
 * @param lastPhaseOrder Watermark recorded before the call.
 * @param phase Phase carried by the fixture section.
 * @param seenPhaseNames Phases already seen for the block.
 * @returns Run input plus captured message identifiers.
 * @example
 * ```typescript
 * const run = createSectionOrderRun(1, "Arrange", []);
 * ```
 */
const createSectionOrderRun = (
  lastPhaseOrder: number,
  phase: string,
  seenPhaseNames: string[],
) => {
  const { context, messageIds } = createRecordingContext();

  return {
    input: {
      context,
      lastPhaseOrder,
      section: { comment: {}, phase },
      seenPhases: new Set(seenPhaseNames),
    } as Parameters<typeof updateSectionOrder>[0],
    messageIds,
  };
};

export {
  createAnalysisFixture,
  createRecordingContext,
  createSectionCommentFixture,
  createSectionOrderRun,
  createStatementFixture,
};
