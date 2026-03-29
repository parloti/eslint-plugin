import type { Rule } from "eslint";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { phasePurityReportingBehaviorCompanion } from "./phase-purity-reporting.behavior";

/** Mocked AAA helper module shape used in reporting tests. */
interface PhasePurityAaaModule {
  /** Assertion predicate. */
  hasAssertion: (node: ReportingNode) => boolean;

  /** Async-logic predicate. */
  hasAsyncLogic: (node: ReportingNode) => boolean;

  /** Await predicate. */
  hasAwait: (node: ReportingNode) => boolean;

  /** Capturable-act predicate. */
  hasCapturableActResult: (node: ReportingNode) => boolean;

  /** Mutation predicate. */
  hasMutation: (node: ReportingNode) => boolean;

  /** Meaningful-act predicate. */
  isMeaningfulActStatement: (node: ReportingNode) => boolean;

  /** Setup-like predicate. */
  isSetupLikeStatement: (node: ReportingNode) => boolean;

  /** Valid-assert predicate. */
  isValidAssertStatement: (node: ReportingNode) => boolean;
}

/** Mocked identifier helper module shape used in reporting tests. */
interface PhasePurityIdentifierModule {
  /** Referenced Assert identifiers. */
  getAssertReferencedIdentifiers: () => Set<string>;

  /** Asserted Act-result predicate. */
  isActResultAsserted: typeof isActResultAsserted;
}

/** Imported reporting helper module shape used in tests. */
interface PhasePurityReportingModule {
  /** Reporting helper under test. */
  reportPhasePurityViolations: (
    context: Rule.RuleContext,
    analysis: never,
  ) => void;
}

/** Statement metadata used by the mocked phase-purity helpers. */
interface ReportingNode {
  /** Whether the Act result is asserted. */
  asserted?: boolean;

  /** Whether the node represents an assertion. */
  assertion?: boolean;

  /** Whether the node triggers async behavior. */
  asyncLogic?: boolean;

  /** Whether the node contains an await expression. */
  await?: boolean;

  /** Whether the node has a capturable Act result. */
  capturable?: boolean;

  /** Whether the node is a meaningful Act statement. */
  meaningfulAct?: boolean;

  /** Whether the node mutates state. */
  mutation?: boolean;

  /** Whether the node is setup-like. */
  setupLike?: boolean;

  /** ESTree node type. */
  type: string;

  /** Whether the node is a valid Assert statement. */
  validAssert?: boolean;
}

/** Captured rule context and emitted reports. */
interface RuleContextState {
  /** Mock ESLint rule context. */
  context: Rule.RuleContext;

  /** Reports emitted during rule execution. */
  reports: Rule.ReportDescriptor[];
}

/**
 * Creates the mocked AAA module for reporting behavior tests.
 * @returns Mocked AAA helper exports.
 * @example
 * ```typescript
 * const mockedAaa = createAaaModule();
 * ```
 */
function createAaaModule(): PhasePurityAaaModule {
  return {
    hasAssertion: (node: ReportingNode): boolean => node.assertion === true,
    hasAsyncLogic: (node: ReportingNode): boolean => node.asyncLogic === true,
    hasAwait: (node: ReportingNode): boolean => node.await === true,
    hasCapturableActResult: (node: ReportingNode): boolean =>
      node.capturable === true,
    hasMutation: (node: ReportingNode): boolean => node.mutation === true,
    isMeaningfulActStatement: (node: ReportingNode): boolean =>
      node.meaningfulAct === true,
    isSetupLikeStatement: (node: ReportingNode): boolean =>
      node.setupLike === true,
    isValidAssertStatement: (node: ReportingNode): boolean =>
      node.validAssert === true,
  };
}

/**
 * Determines whether the mocked Act result is asserted.
 * @param identifiers Referenced Assert identifiers.
 * @param node Reporting node under inspection.
 * @returns Whether the mocked node is asserted.
 * @example
 * ```typescript
 * const isAsserted = isActResultAsserted(new Set(["actualResult"]), { asserted: true, type: "ExpressionStatement" });
 * ```
 */
function isActResultAsserted(
  identifiers: Set<string>,
  node: ReportingNode,
): boolean {
  void identifiers;

  return node.asserted === true;
}

/** Active identifier set returned by the mocked identifier helper. */
let activeAssertIdentifiers: Set<string>;

/**
 * Creates the mocked phase-purity identifier helpers.
 * @returns Mocked identifier helper exports.
 * @example
 * ```typescript
 * const mockedIdentifiers = createIdentifierModule();
 * ```
 */
function createIdentifierModule(): PhasePurityIdentifierModule {
  return {
    getAssertReferencedIdentifiers: (): Set<string> => activeAssertIdentifiers,
    isActResultAsserted,
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
 * Loads the reporting helpers with mocked AAA predicates.
 * @returns Imported reporting helper module.
 * @example
 * ```typescript
 * const reporting = await loadReporting();
 * ```
 */
const loadReporting = async (): Promise<PhasePurityReportingModule> => {
  return import("./phase-purity-reporting");
};

/**
 * Runs the reporting helper against one analysis object.
 * @param analysis Analysis object passed to the reporting helper.
 * @returns Reports emitted by the helper.
 * @example
 * ```typescript
 * const reports = await runReporting({ sectionComments: [], statements: [] });
 * ```
 */
const runReporting = async (
  analysis: unknown,
): Promise<Rule.ReportDescriptor[]> => {
  const { reportPhasePurityViolations } = await loadReporting();
  const { context, reports } = createContext();
  reportPhasePurityViolations(context, analysis as never);

  return reports;
};

describe("enforce-aaa-phase-purity reporting behavior", () => {
  beforeEach(() => {
    activeAssertIdentifiers = new Set(["actualResult"]);
    vi.resetModules();
    vi.doMock(import("../aaa"), createAaaModule);
    vi.doMock(import("./phase-purity-identifiers"), createIdentifierModule);
  });

  afterEach(() => {
    vi.doUnmock("../aaa");
    vi.doUnmock("./phase-purity-identifiers");
    vi.resetModules();
  });

  it("exports the companion marker", () => {
    // Arrange

    // Act
    const actual = phasePurityReportingBehaviorCompanion;

    // Assert
    expect(actual).toBe(true);
  });

  it("skips analysis when AAA sections are incomplete", async () => {
    // Arrange
    const analysis = {
      callExpression: { type: "CallExpression" },
      sectionComments: [{ phases: ["Arrange"] }],
      statements: [],
    };

    // Act
    const actual = await runReporting(analysis);

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("reports arrange, act, assert, and missing-act violations", async () => {
    // Arrange
    const arrangeNode: ReportingNode = {
      assertion: true,
      asyncLogic: true,
      await: true,
      meaningfulAct: true,
      type: "ExpressionStatement",
    };
    const actNode: ReportingNode = {
      assertion: true,
      setupLike: true,
      type: "ExpressionStatement",
    };
    const assertNode: ReportingNode = {
      await: true,
      mutation: true,
      type: "ExpressionStatement",
      validAssert: false,
    };
    const analysis = {
      callExpression: { type: "CallExpression" },
      sectionComments: [
        { phases: ["Arrange"] },
        { phases: ["Act"] },
        { phases: ["Assert"] },
      ],
      statements: [
        { node: arrangeNode, phases: ["Arrange"] },
        { node: actNode, phases: ["Act"] },
        { node: assertNode, phases: ["Assert"] },
      ],
    };

    // Act
    const actual = await runReporting(analysis);

    // Assert
    expect(actual).toStrictEqual([
      { messageId: "assertionOutsideAssert", node: arrangeNode },
      { messageId: "awaitOutsideAct", node: arrangeNode },
      { messageId: "asyncInArrange", node: arrangeNode },
      { messageId: "actionInArrange", node: arrangeNode },
      { messageId: "assertionOutsideAssert", node: actNode },
      { messageId: "setupAfterAct", node: actNode },
      { messageId: "awaitOutsideAct", node: assertNode },
      { messageId: "mutationAfterAct", node: assertNode },
      {
        messageId: "missingMeaningfulAct",
        node: { type: "CallExpression" },
      },
    ]);
  });
});
