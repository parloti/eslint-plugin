import type { Rule } from "eslint";

import { describe, expect, it, vi } from "vitest";

import type { SectionComment, TestBlockAnalysis } from "../aaa";
import type { ScenarioResult } from "./rule.reporting";

import {
  createAaaModuleMock,
  createMissingSectionFixesModule,
  createRecordedFixer,
  createRuleContext,
  getDescriptorFix,
  getReportMessageId,
  loadRequireAaaSectionsRule,
} from "./rule.reporting";

/**
 * Runs the mocked reporting scenario used to validate report ordering and fixes.
 * @param buildMissingSectionFixes Mocked missing-section fix builder.
 * @returns Report metadata captured from the rule execution.
 * @example
 * ```typescript
 * const actual = await collectScenarioResult(() => []);
 * void actual;
 * ```
 */
async function collectScenarioResult(
  buildMissingSectionFixes: () => Rule.Fix[],
): Promise<ScenarioResult> {
  const reports: Rule.ReportDescriptor[] = [];
  const insertedFixes: Rule.Fix[] = [];

  vi.doMock(import("../aaa"), (): never => createAaaModuleMock() as never);
  vi.doMock(
    import("./missing-section-fixes"),
    createMissingSectionFixesModule.bind(void 0, buildMissingSectionFixes),
  );

  const ruleUnderTest = await loadRequireAaaSectionsRule();
  const callExpressionListener = ruleUnderTest.create(
    createRuleContext(reports),
  ).CallExpression;
  const fixer = createRecordedFixer(insertedFixes);

  callExpressionListener?.({ type: "CallExpression" } as never);

  return {
    blankLineFix: getDescriptorFix(reports[2], fixer),
    insertedFixes,
    messageIds: reports.map((descriptor) => getReportMessageId(descriptor)),
    missingSectionsFix: getDescriptorFix(reports[0], fixer),
  };
}

/**
 * Runs a mocked scenario where adjacent section lookup yields an undefined entry.
 * @returns Reported message ids captured from the rule execution.
 * @example
 * ```typescript
 * const actual = await collectUndefinedAdjacentScenario();
 * void actual;
 * ```
 */
async function collectUndefinedAdjacentScenario(): Promise<
  (string | undefined)[]
> {
  const reports: Rule.ReportDescriptor[] = [];
  const arrangeSectionComment = {
    comment: {
      loc: {
        start: {
          line: 2,
        },
      },
    },
    phases: ["Arrange"],
  } as unknown as SectionComment;

  const sectionComments = {
    0: arrangeSectionComment,
    1: void 0,
    entries: function* (): Generator<[number, SectionComment], void, void> {
      yield [0, arrangeSectionComment];
    },
    find: (predicate: (comment: SectionComment) => boolean) =>
      predicate(arrangeSectionComment) ? arrangeSectionComment : void 0,
    flatMap: (callback: (comment: SectionComment) => readonly string[]) =>
      callback(arrangeSectionComment),
    length: 2,
  } as unknown as TestBlockAnalysis["sectionComments"];

  const analysis = {
    bodyLineCount: 5,
    callExpression: { type: "CallExpression" },
    newline: "\n",
    sectionComments,
    sourceText: "// Arrange\nconst value = setup();\n",
    statements: [
      {
        node: {
          loc: {
            start: {
              line: 2,
            },
          },
        },
        phases: ["Arrange"],
      },
    ],
  } as unknown as TestBlockAnalysis;

  vi.doMock(import("../aaa"), async () => {
    const actual = await vi.importActual<typeof import("../aaa")>("../aaa");

    return {
      ...actual,
      aaaPhaseOrder: { Act: 1, Arrange: 0, Assert: 2 } as const,
      analyzeTestBlock: () => analysis,
      getLineStartRange: () => [0, 0],
      getPhaseBoundaryComments: () => [],
      hasBlankLineBeforeComment: () => true,
    };
  });
  vi.doMock(import("./missing-section-fixes"), () => ({
    buildMissingSectionFixes: () => [],
  }));

  const ruleUnderTest = await loadRequireAaaSectionsRule();
  const callExpressionListener = ruleUnderTest.create(
    createRuleContext(reports),
  ).CallExpression;

  callExpressionListener?.({ type: "CallExpression" } as never);

  return reports.map((descriptor) => getReportMessageId(descriptor));
}

describe("require-aaa-sections rule reporting", () => {
  it("reports blank lines before Act sections and code before Arrange", async () => {
    // Arrange
    const buildMissingSectionFixes = vi.fn((): Rule.Fix[] => []);

    // Act
    const actual = await collectScenarioResult(buildMissingSectionFixes);

    // Assert
    expect(actual.messageIds).toStrictEqual([
      "missingSections",
      "codeBeforeArrange",
      "blankLineBeforeSection",
    ]);
    expect(actual.missingSectionsFix).toStrictEqual([]);
    expect(actual.blankLineFix).toStrictEqual({ range: [7, 7], text: "\n" });
    expect(actual.insertedFixes).toStrictEqual([{ range: [7, 7], text: "\n" }]);
    expect(buildMissingSectionFixes).toHaveBeenCalledTimes(1);
  });

  it("returns undefined for missing fixes and unsupported message ids", () => {
    // Arrange
    const fixer = createRecordedFixer([]);

    // Act
    const actual = {
      fix: getDescriptorFix(void 0, fixer),
      messageId: getReportMessageId({ messageId: "unexpected" } as never),
    };

    // Assert
    expect(actual).toStrictEqual({ fix: void 0, messageId: void 0 });
  });

  it("materializes iterable fixer output", () => {
    // Arrange
    const fixer = createRecordedFixer([]);
    const descriptor = {
      *fix(): Generator<Rule.Fix, void, void> {
        yield { range: [1, 1], text: "// Arrange\n" };
        yield { range: [2, 2], text: "// Act\n" };
      },
      messageId: "missingSections",
      node: { type: "CallExpression" },
    } as unknown as Rule.ReportDescriptor;

    // Act
    const actual = getDescriptorFix(descriptor, fixer);

    // Assert
    expect(actual).toStrictEqual([
      { range: [1, 1], text: "// Arrange\n" },
      { range: [2, 2], text: "// Act\n" },
    ]);
  });

  it("skips out-of-order reporting when adjacent lookup returns undefined", async () => {
    // Act
    const actualReportedMessageIds = await collectUndefinedAdjacentScenario();

    // Assert
    expect(actualReportedMessageIds).toContain("missingSections");
    expect(actualReportedMessageIds).not.toContain("outOfOrderSection");
  });
});
