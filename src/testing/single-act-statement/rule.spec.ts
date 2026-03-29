import type { Rule } from "eslint";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Captured rule context and emitted reports. */
interface RuleContextState {
  /** Mock ESLint rule context. */
  context: Rule.RuleContext;

  /** Reports emitted during rule execution. */
  reports: Rule.ReportDescriptor[];
}

/** Mocked AAA analysis state for the current test. */
interface SingleActAaaMockState {
  /** Parsed analysis returned by the mocked analyzer. */
  analysis: unknown;

  /** Number of Act statements reported by the mocked counter. */
  count: number;
}

/** Mocked AAA module shape used by the rule tests. */
interface SingleActAaaModule {
  /** Mocked analyzer result. */
  analyzeTestBlock: () => unknown;

  /** Mocked Act statement counter. */
  countActStatements: () => number;
}

/** Imported rule module shape used by these tests. */
interface SingleActStatementModule {
  /** Rule under test. */
  singleActStatementRule: Rule.RuleModule;
}

/** Active AAA analysis state used by the module mock. */
let activeAaaState: SingleActAaaMockState;

/**
 * Creates the mocked AAA module for the single-act rule tests.
 * @returns Mocked AAA helpers.
 * @example
 * ```typescript
 * const mockedAaa = createAaaModule();
 * ```
 */
function createAaaModule(): SingleActAaaModule {
  return {
    analyzeTestBlock: (): unknown => activeAaaState.analysis,
    countActStatements: (): number => activeAaaState.count,
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
 * @returns Imported rule module.
 * @example
 * ```typescript
 * const module = await loadRule(void 0, 0);
 * ```
 */
const loadRule = async (
  analysis: unknown,
  actStatementCount: number,
): Promise<SingleActStatementModule> => {
  activeAaaState = { analysis, count: actStatementCount };

  return import("./rule");
};

/**
 * Runs the rule against one synthetic call expression.
 * @param analysis Parsed AAA analysis returned by the mock.
 * @param actStatementCount Act statement count returned by the mock.
 * @param callExpression Call expression inspected by the rule.
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
): Promise<Rule.ReportDescriptor[]> => {
  const { singleActStatementRule } = await loadRule(
    analysis,
    actStatementCount,
  );
  const { context, reports } = createContext();
  const listener = singleActStatementRule.create(context).CallExpression;

  listener?.(callExpression as never);

  return reports;
};

describe("single-act-statement rule", () => {
  beforeEach(() => {
    activeAaaState = { analysis: void 0, count: 0 };
    vi.resetModules();
    vi.doMock(import("../aaa"), (): never => createAaaModule() as never);
  });

  afterEach(() => {
    vi.doUnmock("../aaa");
    vi.resetModules();
  });

  it("defines metadata and messages", async () => {
    // Arrange

    // Act
    const actual = await loadRule(void 0, 0);

    // Assert
    expect(actual.singleActStatementRule.meta?.messages).toHaveProperty(
      "multipleActStatements",
    );
    expect(
      actual.singleActStatementRule.meta?.docs?.description?.includes(
        "single top-level statement",
      ),
    ).toBe(true);
  });

  it("skips unsupported test blocks", async () => {
    // Arrange

    // Act
    const actual = await runRule(void 0, 0);

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("reports when the Act phase contains multiple statements", async () => {
    // Arrange
    const callExpression = { type: "CallExpression" } as Rule.Node;

    // Act
    const actual = await runRule({ callExpression }, 2, callExpression);

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
