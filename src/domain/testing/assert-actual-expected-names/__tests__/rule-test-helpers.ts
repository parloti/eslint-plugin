import type { Rule } from "eslint";
import type * as ESTree from "estree";

import type { LocatedNode, TestBlockAnalysis } from "../../aaa/types";

/** Mocked AAA module shape used by the assertion-name rule tests. */
interface AssertActualExpectedNamesAnalysisModule {
  /** Mocked analyzer result. */
  analyzeTestBlock: () => TestBlockAnalysis | undefined;
}

/** Mocked assertion helper module shape used by the assertion-name rule tests. */
interface AssertActualExpectedNamesAssertionsModule {
  /** Assert-scope declared identifiers. */
  getAssertDeclaredIdentifiers: () => Map<
    string,
    LocatedNode<ESTree.Identifier>
  >;

  /** Assertion identifier lookup. */
  getAssertionIdentifiers: (node: unknown) => AssertionIdentifiers;

  /** Assertion predicate. */
  hasAssertion: (node: unknown) => boolean;

  /** Prefix check helper. */
  usesPrefix: (name: string, prefix: "actual" | "expected") => boolean;
}

/** Imported rule module shape used by these tests. */
interface AssertActualExpectedNamesModule {
  /** Rule under test. */
  assertActualExpectedNamesRule: Rule.RuleModule;
}

/** Captured assertion identifier names for one assertion node. */
interface AssertionIdentifier {
  /** Actual-value variable name when present. */
  actual?: string;

  /** Expected-value variable name when present. */
  expected?: string;
}

/** Assertion identifier names exposed by the mocked helper module. */
interface AssertionIdentifiers {
  /** Actual-value variable name when present. */
  actual: string | undefined;

  /** Expected-value variable name when present. */
  expected: string | undefined;
}

/** Mocked AAA analysis input used to load the rule. */
interface LoadRuleInput {
  /** Parsed test-block analysis. */
  analysis: unknown;

  /** Assertion identifier lookup keyed by assertion node. */
  assertionIdentifiers: Map<unknown, AssertionIdentifier>;

  /** Set of nodes treated as assertions. */
  assertionNodes: ReadonlySet<unknown>;

  /** Declared identifiers available inside Assert. */
  declaredIdentifiers: Map<string, Rule.Node>;
}

/** Captured rule context and emitted reports. */
interface RuleContextState {
  /** Mock ESLint rule context. */
  context: Rule.RuleContext;

  /** Reports emitted during rule execution. */
  reports: Rule.ReportDescriptor[];
}

/** Active AAA assertion analysis state used by the module mocks. */
interface RuleMockState {
  /** Mocked analysis input used to load the rule. */
  activeLoadRuleInput: LoadRuleInput | undefined;
}

/** Shared mutable state for the assertion-name rule test mocks. */
const ruleMockState: RuleMockState = { activeLoadRuleInput: void 0 };

/**
 * Creates the mocked analysis module for the assertion-name rule tests.
 * @returns Mocked analyzer helper.
 * @example
 * ```typescript
 * const mockedAnalysis = createAnalysisModule();
 * ```
 */
function createAnalysisModule(): AssertActualExpectedNamesAnalysisModule {
  return {
    analyzeTestBlock: (): TestBlockAnalysis | undefined =>
      ruleMockState.activeLoadRuleInput?.analysis as
        TestBlockAnalysis | undefined,
  };
}

/**
 * Creates the mocked assertion helper module for the assertion-name rule tests.
 * @returns Mocked assertion helpers.
 * @example
 * ```typescript
 * const mockedAssertions = createAssertionsModule();
 * ```
 */
function createAssertionsModule(): AssertActualExpectedNamesAssertionsModule {
  return {
    getAssertDeclaredIdentifiers: (): Map<
      string,
      LocatedNode<ESTree.Identifier>
    > =>
      ruleMockState.activeLoadRuleInput?.declaredIdentifiers as unknown as Map<
        string,
        LocatedNode<ESTree.Identifier>
      >,
    getAssertionIdentifiers: (node: unknown): AssertionIdentifiers => {
      const stored =
        ruleMockState.activeLoadRuleInput?.assertionIdentifiers.get(node);
      return stored === void 0
        ? { actual: void 0, expected: void 0 }
        : { actual: stored.actual, expected: stored.expected };
    },
    hasAssertion: (node: unknown): boolean =>
      ruleMockState.activeLoadRuleInput?.assertionNodes.has(node) === true,
    usesPrefix: (name: string, prefix: "actual" | "expected"): boolean =>
      name.startsWith(prefix),
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
function createContext(): RuleContextState {
  const reports: Rule.ReportDescriptor[] = [];

  return {
    context: {
      report: (descriptor: Rule.ReportDescriptor): void => {
        reports.push(descriptor);
      },
    } as unknown as Rule.RuleContext,
    reports,
  };
}

/**
 * Loads the rule with mocked AAA identifier analysis.
 * @param input Mocked analysis state.
 * @returns Imported rule module.
 * @example
 * ```typescript
 * const ruleModule = await loadRule({ analysis: void 0, assertionIdentifiers: new Map(), assertionNodes: new Set(), declaredIdentifiers: new Map() });
 * ```
 */
async function loadRule(
  input: LoadRuleInput,
): Promise<AssertActualExpectedNamesModule> {
  ruleMockState.activeLoadRuleInput = input;

  return import("../rule");
}

/**
 * Restores the mocked analysis input to an empty default fixture.
 * @example
 * ```typescript
 * resetRuleMockState();
 * ```
 */
function resetRuleMockState(): void {
  ruleMockState.activeLoadRuleInput = {
    analysis: void 0,
    assertionIdentifiers: new Map<unknown, AssertionIdentifier>(),
    assertionNodes: new Set<unknown>(),
    declaredIdentifiers: new Map<string, Rule.Node>(),
  };
}

/**
 * Runs the rule against one synthetic call expression.
 * @param input Mocked analysis state.
 * @returns Reports emitted by the rule.
 * @example
 * ```typescript
 * const reports = await runRule({ analysis: void 0, assertionIdentifiers: new Map(), assertionNodes: new Set(), declaredIdentifiers: new Map() });
 * ```
 */
async function runRule(input: LoadRuleInput): Promise<Rule.ReportDescriptor[]> {
  const { assertActualExpectedNamesRule } = await loadRule(input);
  const { context, reports } = createContext();
  const listener = assertActualExpectedNamesRule.create(context).CallExpression;

  listener?.({ type: "CallExpression" } as never);

  return reports;
}

export type { LoadRuleInput };
export {
  createAnalysisModule,
  createAssertionsModule,
  loadRule,
  resetRuleMockState,
  runRule,
};
