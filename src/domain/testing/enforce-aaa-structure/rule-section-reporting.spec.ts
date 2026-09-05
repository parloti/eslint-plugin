import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { TestBlockAnalysis } from "../aaa/types";

import {
  createAnalysisFixture,
  createRecordingContext,
  createSectionCommentFixture,
  createSectionOrderRun,
  createStatementFixture,
} from "./__tests__/test-helpers";
import {
  reportBlankLineSeparators,
  reportCodeBeforeArrange,
  reportEmptySections,
  reportMissingSections,
  reportOutOfOrderSections,
  updateSectionOrder,
} from "./rule-section-reporting";

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

  it("reports section comments that lack a blank line above them", () => {
    // Arrange
    const analysis = createAnalysisFixture(
      [
        createSectionCommentFixture(["Arrange"], 2),
        createSectionCommentFixture(["Act"], 4),
      ],
      [],
    ) as TestBlockAnalysis & { sourceText: string };
    analysis.sourceText = "line1\nline2\nline3\n";
    let fixCalls = 0;
    const reports: Rule.ReportDescriptor[] = [];

    const context = {
      report: (descriptor: Rule.ReportDescriptor): void => {
        reports.push(descriptor);

        descriptor.fix?.({
          insertTextBeforeRange: (): Rule.Fix => {
            fixCalls += 1;
            return { range: [0, 0], text: "\n" };
          },
        } as unknown as Rule.RuleFixer);
      },
    } as unknown as Rule.RuleContext;

    // Act
    reportBlankLineSeparators(context, analysis);

    // Assert
    expect(reports[0]).toMatchObject({
      messageId: "blankLineBeforeSection",
      suggest: [{ messageId: "addBlankLineBeforeSection" }],
    });
    expect(fixCalls).toBe(1);
  });
});
