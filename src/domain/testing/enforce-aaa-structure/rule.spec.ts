import type { Rule } from "eslint";

import { beforeEach, describe, expect, it, vi } from "vitest";

/** AAA phase-order mapping used by the mock. */
interface AaaPhaseOrder {
  /** Sort index for the Act phase. */
  Act: number;

  /** Sort index for the Arrange phase. */
  Arrange: number;

  /** Sort index for the Assert phase. */
  Assert: number;
}

/** Mocked analysis helper module shape used by the structure rule tests. */
interface EnforceAaaStructureAnalysisHelpersModule {
  /** AAA phase ordering. */
  aaaPhaseOrder: AaaPhaseOrder;

  /** Mocked flattened section list. */
  getFlattenedSections: () => FlattenedSection[];
}

/** Mocked analysis module shape used by the structure rule tests. */
interface EnforceAaaStructureAnalysisModule {
  /** Mocked analyzer result. */
  analyzeTestBlock: () => unknown;
}

/** Mocked AAA structure state for the current test. */
interface EnforceAaaStructureMockState {
  /** Parsed analysis returned by the mocked analyzer. */
  analysis: unknown;

  /** Flattened AAA sections returned by the mocked helper. */
  flattenedSections: FlattenedSection[];
}

/** Imported rule module shape used by these tests. */
interface EnforceAaaStructureModule {
  /** Rule under test. */
  enforceAaaStructureRule: Rule.RuleModule;
}

/** Flattened AAA section entry used by the mocked analyzer. */
interface FlattenedSection {
  /** Comment node associated with the section. */
  comment: Rule.Node;

  /** AAA phase label reported by the analyzer. */
  phase: string;
}

/** Captured rule context and emitted reports. */
interface RuleContextState {
  /** Mock ESLint rule context. */
  context: Rule.RuleContext;

  /** Reports emitted during rule execution. */
  reports: Rule.ReportDescriptor[];
}

/** Active AAA structure mock state used by the module mock. */
let activeStructureState: EnforceAaaStructureMockState;

/**
 * Creates the mocked analysis helpers for the structure rule tests.
 * @returns Mocked analysis helpers.
 * @example
 * ```typescript
 * const mockedHelpers = createAnalysisHelpersModule();
 * ```
 */
function createAnalysisHelpersModule(): EnforceAaaStructureAnalysisHelpersModule {
  return {
    aaaPhaseOrder: { Act: 1, Arrange: 0, Assert: 2 },
    getFlattenedSections: (): FlattenedSection[] =>
      activeStructureState.flattenedSections,
  };
}

/**
 * Creates the mocked analysis module for the structure rule tests.
 * @returns Mocked analyzer helper.
 * @example
 * ```typescript
 * const mockedAnalysis = createAnalysisModule();
 * ```
 */
function createAnalysisModule(): EnforceAaaStructureAnalysisModule {
  return {
    analyzeTestBlock: (): unknown => activeStructureState.analysis,
  };
}

/**
 * Builds a mock ESLint context that records emitted reports.
 * @returns Captured context state.
 * @example
 * ```typescript
 * const state = createContext();
 * ```
 */
const createContext = (): RuleContextState => {
  const reports: Rule.ReportDescriptor[] = [];

  return {
    context: {
      report: (descriptor: Rule.ReportDescriptor): void => {
        reports.push(descriptor);
      },
    } as Rule.RuleContext,
    reports,
  };
};

/**
 * Loads the rule with mocked AAA structure analysis.
 * @param analysis Parsed AAA analysis returned by the mock.
 * @param flattenedSections Flattened sections returned by the mock.
 * @returns Imported rule module.
 * @example
 * ```typescript
 * const module = await loadRule(void 0, []);
 * ```
 */
const loadRule = async (
  analysis: unknown,
  flattenedSections: FlattenedSection[],
): Promise<EnforceAaaStructureModule> => {
  activeStructureState = { analysis, flattenedSections };

  return import("./rule");
};

/**
 * Runs the rule against one synthetic call expression.
 * @param analysis Parsed AAA analysis returned by the mock.
 * @param flattenedSections Flattened sections returned by the mock.
 * @returns Reports emitted by the rule.
 * @example
 * ```typescript
 * const reports = await runRule(void 0, []);
 * ```
 */
const runRule = async (
  analysis: unknown,
  flattenedSections: FlattenedSection[],
): Promise<Rule.ReportDescriptor[]> => {
  const { enforceAaaStructureRule } = await loadRule(
    analysis,
    flattenedSections,
  );
  const { context, reports } = createContext();
  const listener = enforceAaaStructureRule.create(context).CallExpression;

  listener?.({ type: "CallExpression" } as never);

  return reports;
};

describe("enforce-aaa-structure rule", () => {
  beforeEach(() => {
    activeStructureState = { analysis: void 0, flattenedSections: [] };
    vi.doMock(
      import("../aaa/analyzer.analysis"),
      (): never => createAnalysisModule() as never,
    );
    vi.doMock(
      import("../aaa/analyzer.analysis.helpers"),
      (): never => createAnalysisHelpersModule() as never,
    );
  });

  it("defines metadata and messages", async () => {
    // Arrange
    const expectedDescriptionFragment = "Arrange, Act, Assert";

    // Act
    const result = await loadRule(void 0, []).then((actual) => ({
      actual,
      descriptionIncludesFragment:
        actual.enforceAaaStructureRule.meta?.docs?.description?.includes(
          expectedDescriptionFragment,
        ) ?? false,
    }));

    // Assert
    expect(result.actual.enforceAaaStructureRule.meta?.messages).toHaveProperty(
      "duplicateSection",
    );
    expect(result.descriptionIncludesFragment).toBe(true);
  });

  it("skips unsupported test blocks", async () => {
    // Arrange
    const expected: [] = [];

    // Act
    const actual = await runRule(void 0, []);

    // Assert
    expect(actual).toStrictEqual(expected);
  });

  it("reports duplicate and out-of-order sections", async () => {
    // Arrange
    const arrangeComment = { type: "Line" } as unknown as Rule.Node;
    const duplicateArrangeComment = { type: "Line" } as unknown as Rule.Node;
    const actComment = { type: "Line" } as unknown as Rule.Node;
    const sections = [
      { comment: arrangeComment, phase: "Arrange" },
      { comment: { type: "Line" } as unknown as Rule.Node, phase: "Assert" },
      { comment: duplicateArrangeComment, phase: "Arrange" },
      { comment: actComment, phase: "Act" },
    ];

    // Act
    const actual = await runRule({}, sections);

    // Assert
    expect(actual).toStrictEqual([
      {
        data: { section: "Arrange" },
        messageId: "duplicateSection",
        node: duplicateArrangeComment,
      },
      {
        data: { section: "Act" },
        messageId: "invalidOrder",
        node: actComment,
      },
    ]);
  });

  it("accepts valid combined AAA phase coverage", async () => {
    // Arrange
    const arrangeCombinedComment = { type: "Line" } as unknown as Rule.Node;
    const assertComment = { type: "Line" } as unknown as Rule.Node;
    const sections = [
      { comment: arrangeCombinedComment, phase: "Arrange" },
      { comment: arrangeCombinedComment, phase: "Act" },
      { comment: assertComment, phase: "Assert" },
    ];

    // Act
    const actual = await runRule({}, sections);

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("reports duplicate phase introduced by combined and split comments", async () => {
    // Arrange
    const arrangeAndActComment = { type: "Line" } as unknown as Rule.Node;
    const duplicateActComment = { type: "Line" } as unknown as Rule.Node;
    const sections = [
      { comment: arrangeAndActComment, phase: "Arrange" },
      { comment: arrangeAndActComment, phase: "Act" },
      { comment: duplicateActComment, phase: "Act" },
      { comment: { type: "Line" } as unknown as Rule.Node, phase: "Assert" },
    ];

    // Act
    const actual = await runRule({}, sections);

    // Assert
    expect(actual).toStrictEqual([
      {
        data: { section: "Act" },
        messageId: "duplicateSection",
        node: duplicateActComment,
      },
    ]);
  });

  it("reports out-of-order phase introduced after combined Act and Assert", async () => {
    // Arrange
    const actAndAssertComment = { type: "Line" } as unknown as Rule.Node;
    const arrangeComment = { type: "Line" } as unknown as Rule.Node;
    const sections = [
      { comment: actAndAssertComment, phase: "Act" },
      { comment: actAndAssertComment, phase: "Assert" },
      { comment: arrangeComment, phase: "Arrange" },
    ];

    // Act
    const actual = await runRule({}, sections);

    // Assert
    expect(actual).toStrictEqual([
      {
        data: { section: "Arrange" },
        messageId: "invalidOrder",
        node: arrangeComment,
      },
    ]);
  });
});
