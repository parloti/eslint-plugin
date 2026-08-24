import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { SectionComment, TestBlockAnalysis } from "../aaa/types";

import {
  reportCodeBeforeArrange,
  reportEmptySections,
  reportMissingSections,
  reportOutOfOrderSections,
  updateSectionOrder,
} from "./rule-section-reporting";

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
): SectionComment =>
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
  sectionComments: SectionComment[],
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

/** Recording state for one section-order update call. */
interface SectionOrderRun {
  /** Composite input passed to updateSectionOrder. */
  input: Parameters<typeof updateSectionOrder>[0];

  /** Captured message identifiers from the recording context. */
  messageIds: string[];
}

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
): SectionOrderRun => {
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

describe("enforce-aaa-structure rule-section-reporting", () => {
  it("reports missing Act and Assert sections", () => {
    // Arrange
    const analysis = createAnalysisFixture(
      [createSectionCommentFixture(["Arrange"], 2)],
      [createStatementFixture(["Arrange"], 3)],
    );
    const { context, messageIds } = createRecordingContext();

    // Act
    reportMissingSections(context, analysis);

    // Assert
    expect(messageIds).toStrictEqual(["missingSections"]);
  });

  it("stays silent when every required section is present", () => {
    // Arrange
    const analysis = createAnalysisFixture(
      [
        createSectionCommentFixture(["Arrange"], 2),
        createSectionCommentFixture(["Act"], 4),
        createSectionCommentFixture(["Assert"], 6),
      ],
      [
        createStatementFixture(["Arrange"], 3),
        createStatementFixture(["Act"], 5),
        createStatementFixture(["Assert"], 7),
      ],
    );
    const { context, messageIds } = createRecordingContext();

    // Act
    reportMissingSections(context, analysis);

    // Assert
    expect(messageIds).toStrictEqual([]);
  });

  it("reports sections that contain no code", () => {
    // Arrange
    const analysis = createAnalysisFixture(
      [
        createSectionCommentFixture(["Arrange"], 2),
        createSectionCommentFixture(["Assert"], 6),
      ],
      [createStatementFixture(["Arrange"], 3)],
    );
    const { context, messageIds } = createRecordingContext();

    // Act
    reportEmptySections(context, analysis);

    // Assert
    expect(messageIds).toStrictEqual(["emptySection"]);
  });

  it("reports executable statements above the first Arrange marker", () => {
    // Arrange
    const analysis = createAnalysisFixture(
      [createSectionCommentFixture(["Arrange"], 5)],
      [createStatementFixture([], 3)],
    );
    const { context, messageIds } = createRecordingContext();

    // Act
    reportCodeBeforeArrange(context, analysis);

    // Assert
    expect(messageIds).toStrictEqual(["codeBeforeArrange"]);
  });

  it("reports section markers that appear out of order", () => {
    // Arrange
    const analysis = createAnalysisFixture(
      [
        createSectionCommentFixture(["Arrange"], 2),
        createSectionCommentFixture(["Assert"], 4),
        createSectionCommentFixture(["Act"], 6),
      ],
      [],
    );
    const { context, messageIds } = createRecordingContext();

    // Act
    reportOutOfOrderSections(context, analysis);

    // Assert
    expect(messageIds).toStrictEqual(["outOfOrderSection"]);
  });

  it("adds unseen phases and advances the watermark", () => {
    // Arrange
    const run = createSectionOrderRun(1, "Assert", []);

    // Act
    const actualNextOrder = updateSectionOrder(run.input);

    // Assert
    expect(actualNextOrder).toBe(2);
    expect(run.messageIds).toStrictEqual([]);
  });

  it("reports duplicate phases without advancing the watermark", () => {
    // Arrange
    const run = createSectionOrderRun(1, "Arrange", ["Arrange"]);

    // Act
    const actualNextOrder = updateSectionOrder(run.input);

    // Assert
    expect(actualNextOrder).toBe(1);
    expect(run.messageIds).toStrictEqual(["duplicateSection"]);
  });

  it("reports invalid order when phases move backwards", () => {
    // Arrange
    const run = createSectionOrderRun(2, "Act", ["Assert"]);

    // Act
    const actualNextOrder = updateSectionOrder(run.input);

    // Assert
    expect(actualNextOrder).toBe(2);
    expect(run.messageIds).toStrictEqual(["invalidOrder"]);
  });
});
