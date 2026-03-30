/* eslint max-lines: ["error", 310] -- Mocked reporting helpers in this focused spec companion require verbose typed fixtures and examples. */

import type { Rule } from "eslint";

import type { TestBlockAnalysis } from "../aaa";

/** Mocked AAA helper exports consumed by the rule. */
interface AaaModuleMock {
  /** Mocked analyzer entry point. */
  analyzeTestBlock: () => TestBlockAnalysis;
  /** Mocked line-start helper. */
  getLineStartRange: () => [number, number];
  /** Mocked boundary-comment helper. */
  getPhaseBoundaryComments: (
    analysis: TestBlockAnalysis,
  ) => TestBlockAnalysis["sectionComments"];
  /** Mocked blank-line helper. */
  hasBlankLineBeforeComment: () => false;
}

/** Mocked missing-section-fixes module. */
interface MissingSectionFixesModule {
  /** Mocked fix builder. */
  buildMissingSectionFixes: () => Rule.Fix[];
}

/** Message identifiers emitted by the rule under test. */
type RequireAaaSectionsMessageId =
  | "blankLineBeforeSection"
  | "codeBeforeArrange"
  | "emptySection"
  | "missingSections";

/** Typed namespace for the lazily imported rule module. */
interface RuleModuleNamespace {
  /** Rule module loaded after mocks have been applied. */
  requireAaaSectionsRule: Rule.RuleModule;
}

/** Captured result from the mocked reporting scenario. */
interface ScenarioResult {
  /** Fix emitted for the blank-line report. */
  blankLineFix: Rule.Fix | Rule.Fix[] | undefined;
  /** Fixes recorded by the synthetic fixer. */
  insertedFixes: Rule.Fix[];
  /** Message identifiers emitted in report order. */
  messageIds: (RequireAaaSectionsMessageId | undefined)[];
  /** Fix emitted for the missing-sections report. */
  missingSectionsFix: Rule.Fix | Rule.Fix[] | undefined;
}

/**
 * Returns false so the mocked rule path always reports a missing blank line.
 * @returns False for every invocation.
 * @example
 * ```typescript
 * const actual = alwaysReturnFalse(); void actual;
 * ```
 */
function alwaysReturnFalse(): false {
  return false;
}

/**
 * Creates the mocked AAA helper module.
 * @returns Mocked exports consumed by the rule module.
 * @example
 * ```typescript
 * const mockModule = createAaaModuleMock(); void mockModule;
 * ```
 */
function createAaaModuleMock(): AaaModuleMock {
  return {
    analyzeTestBlock: createMockAnalysis,
    getLineStartRange: getMockLineStartRange,
    getPhaseBoundaryComments: getMockPhaseBoundaryComments,
    hasBlankLineBeforeComment: alwaysReturnFalse,
  };
}

/**
 * Creates the mocked missing-section-fixes module.
 * @param buildMissingSectionFixes Mocked fix builder.
 * @returns Mocked module exposing the provided fix builder.
 * @example
 * ```typescript
 * const mockModule = createMissingSectionFixesModule(() => []); void mockModule;
 * ```
 */
function createMissingSectionFixesModule(
  buildMissingSectionFixes: () => Rule.Fix[],
): MissingSectionFixesModule {
  return { buildMissingSectionFixes };
}

/**
 * Builds the synthetic analysis returned by the mocked AAA helpers.
 * @returns Minimal test-block analysis used by the regression scenario.
 * @example
 * ```typescript
 * const analysis = createMockAnalysis(); void analysis;
 * ```
 */
function createMockAnalysis(): TestBlockAnalysis {
  return {
    bodyLineCount: 4,
    callExpression: { type: "CallExpression" },
    newline: "\n",
    sectionComments: [
      {
        comment: {
          loc: { end: { line: 2 }, start: { line: 2 } },
          type: "Line",
        },
        phases: ["Arrange"],
      },
      {
        comment: {
          loc: { end: { line: 4 }, start: { line: 4 } },
          type: "Line",
        },
        phases: ["Act"],
      },
    ],
    sourceText: [
      "const setup = createSetup();",
      "// Arrange",
      "run();",
      "// Act",
    ].join("\n"),
    statements: [
      {
        node: {
          loc: { end: { line: 1 }, start: { line: 1 } },
          type: "ExpressionStatement",
        },
      },
      {
        node: {
          loc: { end: { line: 3 }, start: { line: 3 } },
          type: "ExpressionStatement",
        },
      },
    ],
  } as TestBlockAnalysis;
}

/**
 * Creates a fixer that records inserted text edits.
 * @param insertedFixes Collection updated when the fixer inserts text.
 * @returns Rule fixer that records inserted edits.
 * @example
 * ```typescript
 * const fixer = createRecordedFixer([]); void fixer;
 * ```
 */
function createRecordedFixer(insertedFixes: Rule.Fix[]): Rule.RuleFixer {
  return {
    insertTextBeforeRange(range: [number, number], text: string): Rule.Fix {
      const fix: Rule.Fix = { range, text };
      insertedFixes.push(fix);
      return fix;
    },
  } as Rule.RuleFixer;
}

/**
 * Creates the minimal rule context used by the mocked scenario.
 * @param reports Report descriptors captured during rule execution.
 * @returns Rule context that records emitted reports.
 * @example
 * ```typescript
 * const context = createRuleContext([]); void context;
 * ```
 */
function createRuleContext(reports: Rule.ReportDescriptor[]): Rule.RuleContext {
  return {
    report(descriptor: Rule.ReportDescriptor): void {
      reports.push(descriptor);
    },
  } as Rule.RuleContext;
}

/**
 * Reads the fix emitted by a report descriptor.
 * @param descriptor Report descriptor to evaluate.
 * @param fixer Synthetic fixer passed into the descriptor callback.
 * @returns Fix output produced by the descriptor.
 * @example
 * ```typescript
 * const fix = getDescriptorFix(void 0, {} as never); void fix;
 * ```
 */
function getDescriptorFix(
  descriptor: Rule.ReportDescriptor | undefined,
  fixer: Rule.RuleFixer,
): Rule.Fix | Rule.Fix[] | undefined {
  const actual = descriptor?.fix?.(fixer);

  if (!(actual instanceof Object)) {
    return void 0;
  }

  if (Array.isArray(actual) || "range" in actual) {
    return actual;
  }

  const iterableFixes: Iterable<Rule.Fix> = actual;

  return [...iterableFixes];
}

/**
 * Reads the mocked line-start range for the blank-line fix.
 * @returns Synthetic range used by the rule fix.
 * @example
 * ```typescript
 * const range = getMockLineStartRange(); void range;
 * ```
 */
function getMockLineStartRange(): [number, number] {
  return [7, 7];
}

/**
 * Returns the phase-boundary comments from the mocked analysis.
 * @param analysis Parsed analysis used by the mocked rule helpers.
 * @returns Only comments that begin a later AAA phase.
 * @example
 * ```typescript
 * const comments = getMockPhaseBoundaryComments(createMockAnalysis());
 * void comments;
 * ```
 */
function getMockPhaseBoundaryComments(
  analysis: TestBlockAnalysis,
): TestBlockAnalysis["sectionComments"] {
  return analysis.sectionComments.slice(1);
}

/**
 * Reads the message identifier from a report descriptor when present.
 * @param descriptor Report descriptor emitted by the rule.
 * @returns Supported message identifier when present.
 * @example
 * ```typescript
 * const messageId = getReportMessageId({ messageId: "missingSections" } as Rule.ReportDescriptor);
 * void messageId;
 * ```
 */
function getReportMessageId(
  descriptor: Rule.ReportDescriptor,
): RequireAaaSectionsMessageId | undefined {
  if (
    !("messageId" in descriptor) ||
    !isRequireAaaSectionsMessageId(descriptor.messageId)
  ) {
    return void 0;
  }
  return descriptor.messageId;
}

/**
 * Checks whether an unknown value is a valid rule message identifier.
 * @param value Value to validate.
 * @returns Whether the value is a supported message identifier.
 * @example
 * ```typescript
 * const actual = isRequireAaaSectionsMessageId("missingSections");
 * void actual;
 * ```
 */
function isRequireAaaSectionsMessageId(
  value: unknown,
): value is RequireAaaSectionsMessageId {
  return (
    value === "blankLineBeforeSection" ||
    value === "codeBeforeArrange" ||
    value === "emptySection" ||
    value === "missingSections"
  );
}

/**
 * Loads the rule module after test mocks have been applied.
 * @returns The rule module under test.
 * @example
 * ```typescript
 * const rule = await loadRequireAaaSectionsRule(); void rule;
 * ```
 */
async function loadRequireAaaSectionsRule(): Promise<Rule.RuleModule> {
  return ((await import("./rule")) as RuleModuleNamespace)
    .requireAaaSectionsRule;
}

export {
  createAaaModuleMock,
  createMissingSectionFixesModule,
  createRecordedFixer,
  createRuleContext,
  getDescriptorFix,
  getReportMessageId,
  loadRequireAaaSectionsRule,
};

export type { ScenarioResult };
