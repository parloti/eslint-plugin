import type { Rule } from "eslint";

import { beforeEach, describe, expect, it, vi } from "vitest";

/** Mocked top-level Act statement shape used by test helpers. */
interface MockActStatement {
  /** Statement node exposed to the rule under test. */
  node: Rule.Node;
}

/** Captured rule context and emitted reports. */
interface RuleContextState {
  /** Mock ESLint rule context. */
  context: Rule.RuleContext;

  /** Reports emitted during rule execution. */
  reports: Rule.ReportDescriptor[];
}

/** Mocked AAA analysis state for the current test. */
interface SingleActAaaMockState {
  /** Ordered Act statements returned by the mocked selector. */
  actStatements: readonly MockActStatement[];

  /** Parsed analysis returned by the mocked analyzer. */
  analysis: unknown;

  /** Number of Act statements reported by the mocked counter. */
  count: number;
}

/** Mocked analysis-helper module shape used by the rule tests. */
interface SingleActAnalysisHelpersModule {
  /** Mocked Act statement counter. */
  countActStatements: () => number;

  /** Mocked Act statement selector. */
  getActTopLevelStatements: () => readonly MockActStatement[];
}

/** Mocked analysis module shape used by the rule tests. */
interface SingleActAnalysisModule {
  /** Mocked analyzer result. */
  analyzeTestBlock: () => unknown;
}

/** Imported rule module shape used by these tests. */
interface SingleActStatementModule {
  /** Rule under test. */
  singleActStatementRule: Rule.RuleModule;
}

/** Active AAA analysis state used by the module mock. */
let activeAaaState: SingleActAaaMockState;

/**
 * Creates the mocked analysis-helper module for the single-act rule tests.
 * @returns Mocked analysis helpers.
 * @example
 * ```typescript
 * const mockedHelpers = createAnalysisHelpersModule();
 * ```
 */
function createAnalysisHelpersModule(): SingleActAnalysisHelpersModule {
  return {
    countActStatements: (): number => activeAaaState.count,
    getActTopLevelStatements: (): readonly MockActStatement[] =>
      activeAaaState.actStatements,
  };
}

/**
 * Creates the mocked analysis module for the single-act rule tests.
 * @returns Mocked analyzer helper.
 * @example
 * ```typescript
 * const mockedAnalysis = createAnalysisModule();
 * ```
 */
function createAnalysisModule(): SingleActAnalysisModule {
  return {
    analyzeTestBlock: (): unknown => activeAaaState.analysis,
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
 * Loads the rule with mocked AAA analysis helpers.
 * @param analysis Parsed AAA analysis returned by the mock.
 * @param actStatementCount Act statement count returned by the mock.
 * @param actStatements Act statements returned by the mock selector.
 * @returns Imported rule module.
 * @example
 * ```typescript
 * const module = await loadRule(void 0, 0);
 * ```
 */
const loadRule = async (
  analysis: unknown,
  actStatementCount: number,
  actStatements: readonly MockActStatement[] = [],
): Promise<SingleActStatementModule> => {
  activeAaaState = {
    actStatements,
    analysis,
    count: actStatementCount,
  };

  return import("./rule");
};

/**
 * Runs the rule against one synthetic call expression.
 * @param analysis Parsed AAA analysis returned by the mock.
 * @param actStatementCount Act statement count returned by the mock.
 * @param callExpression Call expression inspected by the rule.
 * @param actStatements Act statements returned by the mock selector.
 * @returns Reports emitted by the rule.
 * @example
 * ```typescript
 * const reports = await runRule(void 0, 0);
 * ```
 */
const runRule = async (
  analysis: unknown,
  actStatementCount: number,
  callExpression: Rule.Node = { type: "CallExpression" } as Rule.Node,
  actStatements: readonly MockActStatement[] = [],
): Promise<Rule.ReportDescriptor[]> => {
  const { singleActStatementRule } = await loadRule(
    analysis,
    actStatementCount,
    actStatements,
  );
  const { context, reports } = createContext();
  const listener = singleActStatementRule.create(context).CallExpression;

  listener?.(callExpression as never);

  return reports;
};

describe("single-act-statement rule", () => {
  beforeEach(() => {
    activeAaaState = { actStatements: [], analysis: void 0, count: 0 };
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
    const expectedDescriptionFragment = "single top-level statement";

    // Act
    const result = await loadRule(void 0, 0).then((actual) => ({
      actual,
      descriptionIncludesFragment:
        actual.singleActStatementRule.meta?.docs?.description?.includes(
          expectedDescriptionFragment,
        ) ?? false,
    }));

    // Assert
    expect(result.actual.singleActStatementRule.meta?.messages).toHaveProperty(
      "multipleActStatements",
    );
    expect(result.descriptionIncludesFragment).toBe(true);
  });

  it("skips unsupported test blocks", async () => {
    // Arrange
    const expected: [] = [];

    // Act
    const actual = await runRule(void 0, 0);

    // Assert
    expect(actual).toStrictEqual(expected);
  });

  it("reports when the Act phase contains multiple statements", async () => {
    // Arrange
    const callExpression = { type: "CallExpression" } as Rule.Node;
    const firstActStatement = {
      node: { type: "ExpressionStatement" } as Rule.Node,
    };
    const secondActStatement = { node: { type: "IfStatement" } as Rule.Node };

    // Act
    const actual = await runRule({ callExpression }, 2, callExpression, [
      firstActStatement,
      secondActStatement,
    ]);

    // Assert
    expect(actual).toStrictEqual([
      {
        data: { count: "2" },
        messageId: "multipleActStatements",
        node: secondActStatement.node,
      },
    ]);
  });

  it("falls back to the call expression when excess Act statement node is missing", async () => {
    // Arrange
    const callExpression = { type: "CallExpression" } as Rule.Node;

    // Act
    const actual = await runRule({ callExpression }, 2, callExpression, []);

    // Assert
    expect(actual).toStrictEqual([
      {
        data: { count: "2" },
        messageId: "multipleActStatements",
        node: callExpression,
      },
    ]);
  });

  it("does not report when the Act phase already has one statement", async () => {
    // Arrange
    const callExpression = { type: "CallExpression" } as Rule.Node;

    // Act
    const actual = await runRule({ callExpression }, 1, callExpression);

    // Assert
    expect(actual).toStrictEqual([]);
  });
});
