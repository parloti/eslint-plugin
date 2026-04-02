import type { Rule } from "eslint";

import { afterEach, describe, expect, it, vi } from "vitest";

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

  vi.resetModules();
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
 * Resets module mocks used by the reporting scenario.
 * @example
 * ```typescript
 * resetScenarioMocks();
 * ```
 */
function resetScenarioMocks(): void {
  vi.doUnmock("../aaa");
  vi.doUnmock("./missing-section-fixes");
  vi.resetModules();
}

describe("require-aaa-sections rule reporting", () => {
  afterEach(resetScenarioMocks);

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
});
