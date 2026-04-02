import type { Rule } from "eslint";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Expression-statement shape used by the synthetic fixtures. */
interface ExpressionStatementNode {
  /** Wrapped expression node. */
  expression: Record<string, unknown>;

  /** ESTree node type. */
  type: "ExpressionStatement";
}

/** Minimal identifier node used by the synthetic ESTree fixtures. */
interface IdentifierNode {
  /** Identifier name. */
  name: string;

  /** ESTree node type. */
  type: string;
}

/** Mocked AAA module shape used by the act-result rule tests. */
interface RequireActResultCaptureAaaModule {
  /** Mocked analyzer result. */
  analyzeTestBlock: () => unknown;

  /** Predicate for capturable Act results. */
  hasCapturableActResult: (node: unknown) => boolean;
}

/** Mocked AAA capture state for the current test. */
interface RequireActResultCaptureMockState {
  /** Parsed analysis returned by the mocked analyzer. */
  analysis: unknown;

  /** Nodes treated as capturable act results. */
  capturableNodes: ReadonlySet<unknown>;
}

/** Imported rule module shape used by these tests. */
interface RequireActResultCaptureModule {
  /** Rule under test. */
  requireActResultCaptureRule: Rule.RuleModule;
}

/** Captured rule context and emitted reports. */
interface RuleContextState {
  /** Mock ESLint rule context. */
  context: Rule.RuleContext;

  /** Reports emitted during rule execution. */
  reports: Rule.ReportDescriptor[];
}

/** Active AAA capture mock state used by the module mock. */
let activeCaptureState: RequireActResultCaptureMockState;

/**
 * Creates an identifier fixture used by the synthetic call expressions.
 * @param name Identifier text assigned to the fixture.
 * @returns ESTree-compatible identifier fixture for the supplied text.
 * @example
 * ```typescript
 * const node = createIdentifier("result");
 * ```
 */
const createIdentifier = (name: string): IdentifierNode => ({
  name,
  type: "Identifier",
});

/**
 * Wraps a call expression fixture in an expression statement node.
 * @param expression Expression wrapped by the statement.
 * @returns Expression statement node.
 * @example
 * ```typescript
 * const statement = createCallStatement({ type: "CallExpression" });
 * ```
 */
const createCallStatement = (
  expression: Record<string, unknown>,
): ExpressionStatementNode => ({
  expression,
  type: "ExpressionStatement",
});

/**
 * Creates the mocked AAA module for the act-result rule tests.
 * @returns Mocked AAA helpers.
 * @example
 * ```typescript
 * const mockedAaa = createAaaModule();
 * ```
 */
function createAaaModule(): RequireActResultCaptureAaaModule {
  return {
    analyzeTestBlock: (): unknown => activeCaptureState.analysis,
    hasCapturableActResult: (node: unknown): boolean =>
      activeCaptureState.capturableNodes.has(node),
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
 * Loads the rule with mocked AAA helpers.
 * @param analysis Parsed AAA analysis returned by the mock.
 * @param capturableNodes Nodes treated as capturable act results.
 * @returns Imported rule module.
 * @example
 * ```typescript
 * const module = await loadRule(void 0, new Set());
 * ```
 */
const loadRule = async (
  analysis: unknown,
  capturableNodes: ReadonlySet<unknown>,
): Promise<RequireActResultCaptureModule> => {
  activeCaptureState = { analysis, capturableNodes };

  return import("./rule");
};

/**
 * Runs the rule against one synthetic call expression.
 * @param analysis Parsed AAA analysis returned by the mock.
 * @param capturableNodes Nodes treated as capturable act results.
 * @returns Reports emitted by the rule.
 * @example
 * ```typescript
 * const reports = await runRule(void 0, new Set());
 * ```
 */
const runRule = async (
  analysis: unknown,
  capturableNodes: ReadonlySet<unknown>,
): Promise<Rule.ReportDescriptor[]> => {
  const { requireActResultCaptureRule } = await loadRule(
    analysis,
    capturableNodes,
  );
  const { context, reports } = createContext();
  const listener = requireActResultCaptureRule.create(context).CallExpression;

  listener?.({ type: "CallExpression" } as never);

  return reports;
};

describe("require-act-result-capture rule", () => {
  beforeEach(() => {
    activeCaptureState = { analysis: void 0, capturableNodes: new Set() };
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
    const actual = await loadRule(void 0, new Set());

    // Assert
    expect(actual.requireActResultCaptureRule.meta?.messages).toHaveProperty(
      "captureActResult",
    );
    expect(
      actual.requireActResultCaptureRule.meta?.docs?.description?.includes(
        "Act expressions",
      ),
    ).toBe(true);
  });

  it("skips unsupported test blocks", async () => {
    // Arrange

    // Act
    const actual = await runRule(void 0, new Set());

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("reports only capturable Act statements that are not helper-driven", async () => {
    // Arrange
    const capturableStatement = createCallStatement({
      arguments: [],
      callee: createIdentifier("runFeature"),
      type: "CallExpression",
    });
    const contextReportStatement = createCallStatement({
      arguments: [],
      callee: {
        object: createIdentifier("context"),
        property: createIdentifier("report"),
        type: "MemberExpression",
      },
      type: "CallExpression",
    });
    const helperDrivenStatement = createCallStatement({
      arguments: [],
      callee: createIdentifier("reportLintMessage"),
      type: "CallExpression",
    });
    const ruleCreateStatement = createCallStatement({
      arguments: [],
      callee: {
        object: createIdentifier("customRule"),
        property: createIdentifier("create"),
        type: "MemberExpression",
      },
      type: "CallExpression",
    });
    const assertStatement = createCallStatement({
      arguments: [],
      callee: createIdentifier("assertLater"),
      type: "CallExpression",
    });
    const analysis = {
      statements: [
        { node: capturableStatement, phases: ["Act"] },
        { node: contextReportStatement, phases: ["Act"] },
        { node: helperDrivenStatement, phases: ["Act"] },
        { node: ruleCreateStatement, phases: ["Act"] },
        { node: assertStatement, phases: ["Act", "Assert"] },
      ],
    };
    const capturableNodes = new Set([
      assertStatement,
      capturableStatement,
      contextReportStatement,
      helperDrivenStatement,
      ruleCreateStatement,
    ]);

    // Act
    const actual = await runRule(analysis, capturableNodes);

    // Assert
    expect(actual).toStrictEqual([
      {
        messageId: "captureActResult",
        node: capturableStatement,
      },
    ]);
  });

  it("skips non-call and non-expression Act statements", async () => {
    // Arrange
    const nonExpressionStatement = { type: "VariableDeclaration" };
    const nonCallStatement = {
      expression: { type: "Identifier" },
      type: "ExpressionStatement",
    };
    const analysis = {
      statements: [
        { node: nonExpressionStatement, phases: ["Act"] },
        { node: nonCallStatement, phases: ["Act"] },
      ],
    };
    const capturableNodes = new Set([nonCallStatement, nonExpressionStatement]);

    // Act
    const actual = await runRule(analysis, capturableNodes);

    // Assert
    expect(actual).toStrictEqual([
      { messageId: "captureActResult", node: nonExpressionStatement },
      { messageId: "captureActResult", node: nonCallStatement },
    ]);
  });
});
