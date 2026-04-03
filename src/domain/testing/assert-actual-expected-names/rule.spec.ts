import type { Rule } from "eslint";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Mocked AAA module shape used by the assertion-name rule tests. */
interface AssertActualExpectedNamesAaaModule {
  /** Mocked analyzer result. */
  analyzeTestBlock: () => unknown;

  /** Assert-scope declared identifiers. */
  getAssertDeclaredIdentifiers: () => Map<string, Rule.Node>;

  /** Assertion identifier lookup. */
  getAssertionIdentifiers: (node: unknown) => AssertionIdentifier;

  /** Assertion predicate. */
  hasAssertion: (node: unknown) => boolean;

  /** Prefix check helper. */
  usesPrefix: (name: string, prefix: string) => boolean;
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

/** Active AAA assertion analysis state used by the module mock. */
let activeLoadRuleInput: LoadRuleInput;

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
    } as unknown as Rule.RuleContext,
    reports,
  };
};

/**
 * Creates the mocked AAA module for the assertion-name rule tests.
 * @returns Mocked AAA helpers.
 * @example
 * ```typescript
 * const mockedAaa = createAaaModule();
 * ```
 */
function createAaaModule(): AssertActualExpectedNamesAaaModule {
  return {
    analyzeTestBlock: (): unknown => activeLoadRuleInput.analysis,
    getAssertDeclaredIdentifiers: (): Map<string, Rule.Node> =>
      activeLoadRuleInput.declaredIdentifiers,
    getAssertionIdentifiers: (node: unknown): AssertionIdentifier =>
      activeLoadRuleInput.assertionIdentifiers.get(node) ?? {},
    hasAssertion: (node: unknown): boolean =>
      activeLoadRuleInput.assertionNodes.has(node),
    usesPrefix: (name: string, prefix: string): boolean =>
      name.startsWith(prefix),
  };
}

/**
 * Loads the rule with mocked AAA identifier analysis.
 * @param input Mocked analysis state.
 * @returns Imported rule module.
 * @example
 * ```typescript
 * const module = await loadRule({ analysis: void 0, assertionIdentifiers: new Map(), assertionNodes: new Set(), declaredIdentifiers: new Map() });
 * ```
 */
const loadRule = async (
  input: LoadRuleInput,
): Promise<AssertActualExpectedNamesModule> => {
  activeLoadRuleInput = input;

  return import("./rule");
};

/**
 * Runs the rule against one synthetic call expression.
 * @param input Mocked analysis state.
 * @returns Reports emitted by the rule.
 * @example
 * ```typescript
 * const reports = await runRule({ analysis: void 0, assertionIdentifiers: new Map(), assertionNodes: new Set(), declaredIdentifiers: new Map() });
 * ```
 */
const runRule = async (
  input: LoadRuleInput,
): Promise<Rule.ReportDescriptor[]> => {
  const { assertActualExpectedNamesRule } = await loadRule(input);
  const { context, reports } = createContext();
  const listener = assertActualExpectedNamesRule.create(context).CallExpression;

  listener?.({ type: "CallExpression" } as never);

  return reports;
};

describe("assert-actual-expected-names rule", () => {
  beforeEach(() => {
    activeLoadRuleInput = {
      analysis: void 0,
      assertionIdentifiers: new Map(),
      assertionNodes: new Set(),
      declaredIdentifiers: new Map(),
    };
    vi.resetModules();
    vi.doMock(import("../aaa"), (): never => createAaaModule() as never);
  });

  afterEach(() => {
    vi.doUnmock("../aaa");
    vi.resetModules();
  });

  it("defines metadata and messages", async () => {
    // Arrange
    const input = {
      analysis: void 0,
      assertionIdentifiers: new Map(),
      assertionNodes: new Set(),
      declaredIdentifiers: new Map(),
    } satisfies LoadRuleInput;

    // Act
    const result = await loadRule(input).then((actual) => ({
      actual,
      descriptionIncludesAssertPhase:
        actual.assertActualExpectedNamesRule.meta?.docs?.description?.includes(
          "Assert-phase",
        ) ?? false,
    }));

    // Assert
    expect(
      result.actual.assertActualExpectedNamesRule.meta?.messages,
    ).toHaveProperty("missingPrefix");
    expect(result.descriptionIncludesAssertPhase).toBe(true);
  });

  it("skips unsupported test blocks", async () => {
    // Arrange
    const input = {
      analysis: void 0,
      assertionIdentifiers: new Map(),
      assertionNodes: new Set(),
      declaredIdentifiers: new Map(),
    } satisfies LoadRuleInput;

    // Act
    const actual = await runRule(input);

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("reports each missing prefix only once", async () => {
    // Arrange
    const firstAssertion = { type: "ExpressionStatement" } as Rule.Node;
    const repeatedAssertion = { type: "ExpressionStatement" } as Rule.Node;
    const ignoredAssertion = { type: "ExpressionStatement" } as Rule.Node;
    const actualNode = { name: "result", type: "Identifier" } as Rule.Node;
    const expectedNode = { name: "value", type: "Identifier" } as Rule.Node;
    const analysis = {
      statements: [
        { node: firstAssertion, phases: ["Assert"] },
        { node: repeatedAssertion, phases: ["Assert"] },
        { node: ignoredAssertion, phases: ["Arrange"] },
      ],
    };
    const input = {
      analysis,
      assertionIdentifiers: new Map([
        [firstAssertion, { actual: "result", expected: "value" }],
        [ignoredAssertion, { expected: "value" }],
        [repeatedAssertion, { actual: "result", expected: "expectedValue" }],
      ]),
      assertionNodes: new Set([
        firstAssertion,
        ignoredAssertion,
        repeatedAssertion,
      ]),
      declaredIdentifiers: new Map([
        ["result", actualNode],
        ["value", expectedNode],
      ]),
    } satisfies LoadRuleInput;

    // Act
    const actual = await runRule(input);

    // Assert
    expect(actual).toStrictEqual([
      {
        data: { name: "result", prefix: "actual" },
        messageId: "missingPrefix",
        node: actualNode,
      },
      {
        data: { name: "value", prefix: "expected" },
        messageId: "missingPrefix",
        node: expectedNode,
      },
    ]);
  });
});
