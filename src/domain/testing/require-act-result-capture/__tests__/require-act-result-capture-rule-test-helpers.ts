import type { Rule } from "eslint";

import type { TestBlockAnalysis } from "../../aaa/types";

/** Holder for the active AAA capture mock state used by the module mock. */
interface ActiveCaptureStateHolder {
  /** Mock state applied to the currently running test. */
  current: RequireActResultCaptureMockState;
}

/** Minimal expression-statement node used by synthetic fixtures. */
interface ExpressionStatementNode {
  /** Wrapped expression node. */
  expression: Record<string, unknown>;
  /** ESTree node type. */
  type: "ExpressionStatement";
}

/** Minimal identifier node used by synthetic fixtures. */
interface IdentifierNode {
  /** Identifier name. */
  name: string;
  /** ESTree node type. */
  type: string;
}

/** Mocked analysis module shape used by the act-result rule tests. */
interface RequireActResultCaptureAnalysisModule {
  /** Mocked analyzer result. */
  analyzeTestBlock: () => TestBlockAnalysis | undefined;
}

/** Mocked classification helper module shape used by the act-result rule tests. */
interface RequireActResultCaptureClassificationModule {
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

/** Holder for the active AAA capture mock state used by the module mock. */
const activeCaptureStateHolder: ActiveCaptureStateHolder = {
  current: { analysis: void 0, capturableNodes: new Set() },
};

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
 * Creates the mocked analysis module for the act-result rule tests.
 * @returns Mocked analyzer helper.
 * @example
 * ```typescript
 * const mockedAnalysis = createAnalysisModule();
 * ```
 */
function createAnalysisModule(): RequireActResultCaptureAnalysisModule {
  return {
    analyzeTestBlock: (): TestBlockAnalysis | undefined =>
      activeCaptureStateHolder.current.analysis as
        TestBlockAnalysis | undefined,
  };
}

/**
 * Creates the mocked classification helper module for the act-result rule tests.
 * @returns Mocked classification helpers.
 * @example
 * ```typescript
 * const mockedClassification = createClassificationModule();
 * ```
 */
function createClassificationModule(): RequireActResultCaptureClassificationModule {
  return {
    hasCapturableActResult: (node: unknown): boolean =>
      activeCaptureStateHolder.current.capturableNodes.has(node),
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
  activeCaptureStateHolder.current = { analysis, capturableNodes };

  return import("../rule");
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

export {
  activeCaptureStateHolder,
  createAnalysisModule,
  createCallStatement,
  createClassificationModule,
  createIdentifier,
  loadRule,
  runRule,
};
export type {
  RequireActResultCaptureAnalysisModule,
  RequireActResultCaptureClassificationModule,
};
