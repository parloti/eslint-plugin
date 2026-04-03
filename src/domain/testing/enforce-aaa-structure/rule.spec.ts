import type { Rule } from "eslint";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** AAA phase-order mapping used by the mock. */
interface AaaPhaseOrder {
  /** Sort index for the Act phase. */
  Act: number;

  /** Sort index for the Arrange phase. */
  Arrange: number;

  /** Sort index for the Assert phase. */
  Assert: number;
}

/** Mocked AAA module shape used by the structure rule tests. */
interface EnforceAaaStructureAaaModule {
  /** AAA phase ordering. */
  aaaPhaseOrder: AaaPhaseOrder;

  /** Mocked analyzer result. */
  analyzeTestBlock: () => unknown;

  /** Mocked flattened section list. */
  getFlattenedSections: () => FlattenedSection[];
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
 * Creates the mocked AAA module for the structure rule tests.
 * @returns Mocked AAA helpers.
 * @example
 * ```typescript
 * const mockedAaa = createAaaModule();
 * ```
 */
function createAaaModule(): EnforceAaaStructureAaaModule {
  return {
    aaaPhaseOrder: { Act: 1, Arrange: 0, Assert: 2 },
    analyzeTestBlock: (): unknown => activeStructureState.analysis,
    getFlattenedSections: (): FlattenedSection[] =>
      activeStructureState.flattenedSections,
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
    vi.resetModules();
    vi.doMock(import("../aaa"), (): never => createAaaModule() as never);
  });

  afterEach(() => {
    vi.doUnmock("../aaa");
    vi.resetModules();
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
});
