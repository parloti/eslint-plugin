import type { Rule } from "eslint";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AnalyzerAsserionsHelpersModule from "../aaa/analyzer.assertions.helpers";
import type * as AnalyzerClassificationHelpers from "../aaa/analyzer.classification.helpers";
import type * as PhasePurityIdentifiersModule from "./phase-purity-identifiers";

import { reportPhasePurityViolations } from "./phase-purity-reporting";

/** Literal call-expression marker used by fixture analysis. */
/** Captured result of one context.report invocation. */
interface MessageCall {
  /** Reported message identifier. */
  messageId: string | undefined;
}

/** Flag payload passed through mocked analyzer helpers. */
interface NodeFlags {
  /** Whether a statement contains an assertion. */
  containsAssertion?: boolean;

  /** Whether a statement includes async control flow. */
  containsAsyncLogic?: boolean;

  /** Whether a statement contains an await expression. */
  containsAwait?: boolean;

  /** Whether a statement mutates state. */
  containsMutation?: boolean;

  /** Whether a statement exposes a capturable Act result. */
  hasCapturableActResult?: boolean;

  /** Whether Act output is asserted later in the test. */
  isActResultAsserted?: boolean;

  /** Whether a statement counts as meaningful Act work. */
  isMeaningfulAct?: boolean;

  /** Whether a statement appears to be setup-only logic. */
  isSetupLike?: boolean;

  /** Whether an assertion call is considered valid for Assert. */
  isValidAssert?: boolean;

  /** Statement node type for fixture analysis. */
  type: string;
}

/** Supported AAA section names in the fixture payload. */
type PhaseName = "Act" | "Arrange" | "Assert";

/** Section comment fixture used by analysis setup. */
interface SectionCommentFixture {
  /** Section phases represented by one section comment. */
  phases: PhaseName[];
}

/** Statement fixture consumed by phase-purity reporting. */
interface StatementFixture {
  /** Statement node analyzed by mock helper functions. */
  node: NodeFlags;

  /** AAA phases assigned to the statement. */
  phases: PhaseName[];
}

/**
 * Checks whether one named flag is enabled on a fixture node.
 * @param node Statement fixture node.
 * @param key Flag key to evaluate.
 * @returns True when the flag is explicitly true.
 * @example
 * ```typescript
 * const value = hasFlag({ type: "ExpressionStatement" }, "containsAwait");
 * ```
 */
const hasFlag = (node: NodeFlags, key: keyof NodeFlags): boolean =>
  node[key] === true;

vi.mock(
  import("../aaa/analyzer.assertions.helpers"),
  createMockProxy<typeof AnalyzerAsserionsHelpersModule>({
    hasAssertion: (node: NodeFlags) => hasFlag(node, "containsAssertion"),
    isValidAssertStatement: (node: NodeFlags) => hasFlag(node, "isValidAssert"),
  }),
);

vi.mock(
  import("../aaa/analyzer.classification.helpers"),
  createMockProxy<typeof AnalyzerClassificationHelpers>({
    hasAsyncLogic: (node: NodeFlags) => hasFlag(node, "containsAsyncLogic"),
    hasAwait: (node: NodeFlags) => hasFlag(node, "containsAwait"),
    hasCapturableActResult: (node: NodeFlags) =>
      hasFlag(node, "hasCapturableActResult"),
    hasMutation: (node: NodeFlags) => hasFlag(node, "containsMutation"),
    isMeaningfulActStatement: (node: NodeFlags) =>
      hasFlag(node, "isMeaningfulAct"),
    isSetupLikeStatement: (node: NodeFlags) => hasFlag(node, "isSetupLike"),
  }),
);

vi.mock(
  import("./phase-purity-identifiers"),
  createMockProxy<typeof PhasePurityIdentifiersModule>({
    getAssertReferencedIdentifiers: () => new Set<string>(),
    isActResultAsserted: (assertReferences: Set<string>, node: NodeFlags) =>
      assertReferences.size >= 0 && hasFlag(node, "isActResultAsserted"),
  }),
);

/**
 * Builds a minimal analysis object accepted by reportPhasePurityViolations.
 * @param statements Statement fixtures to analyze.
 * @param sectionPhases Section phases declared in the test block.
 * @returns Fixture payload for phase-purity reporting.
 * @example
 * ```typescript
 * const analysis = createAnalysis([{ node: { type: "ExpressionStatement" }, phases: ["Act"] }]);
 * ```
 */
const createAnalysis = (
  statements: StatementFixture[],
  sectionPhases: PhaseName[] = ["Act", "Assert"],
) =>
  ({
    callExpression: { type: "CallExpression" },
    sectionComments: sectionPhases.map(
      (phase) =>
        ({
          phases: [phase],
        }) satisfies SectionCommentFixture,
    ),
    statements,
  }) as never;

/**
 * Runs reporting and returns emitted message identifiers.
 * @param analysis Analysis fixture passed to the reporter.
 * @returns Ordered message identifiers collected from context.report.
 * @example
 * ```typescript
 * const messageIds = collectMessageIds(createAnalysis([]));
 * ```
 */
const collectMessageIds = (analysis: unknown): string[] => {
  const calls: MessageCall[] = [];
  const context = {
    report: (descriptor: Rule.ReportDescriptor): void => {
      calls.push({
        messageId: "messageId" in descriptor ? descriptor.messageId : void 0,
      });
    },
  } as Rule.RuleContext;

  reportPhasePurityViolations(context, analysis as never);
  return calls.map((call) => call.messageId ?? "<missing>");
};

describe("enforce-aaa-phase-purity phase-purity-reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports the reporting helper", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof reportPhasePurityViolations;

    // Assert
    expect(actualType).toBe(expectedType);
  });

  it("returns early when required Act and Assert sections are missing", () => {
    // Arrange
    const analysis = createAnalysis(
      [{ node: { type: "ExpressionStatement" }, phases: ["Arrange"] }],
      ["Arrange"],
    );

    // Act
    const actualMessages = collectMessageIds(analysis);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });

  it("reports arrange-only violations", () => {
    // Arrange
    const analysis = createAnalysis([
      {
        node: {
          containsAssertion: true,
          containsAsyncLogic: true,
          containsAwait: true,
          isMeaningfulAct: true,
          type: "ExpressionStatement",
        },
        phases: ["Arrange"],
      },
    ]);

    // Act
    const actualMessages = collectMessageIds(analysis);

    // Assert
    expect(actualMessages).toStrictEqual([
      "assertionOutsideAssert",
      "awaitOutsideAct",
      "asyncInArrange",
      "actionInArrange",
      "missingMeaningfulAct",
    ]);
  });

  it("reports act-only and assert-only violations", () => {
    // Arrange
    const analysis = createAnalysis([
      {
        node: {
          containsAssertion: true,
          isMeaningfulAct: true,
          isSetupLike: true,
          type: "ExpressionStatement",
        },
        phases: ["Act"],
      },
      {
        node: {
          containsAwait: true,
          containsMutation: true,
          isValidAssert: false,
          type: "ExpressionStatement",
        },
        phases: ["Assert"],
      },
    ]);

    // Act
    const actualMessages = collectMessageIds(analysis);

    // Assert
    expect(actualMessages).toStrictEqual([
      "assertionOutsideAssert",
      "awaitOutsideAct",
      "mutationAfterAct",
    ]);
  });

  it("reports mixed-phase violations and missing meaningful act", () => {
    // Arrange
    const analysis = createAnalysis([
      {
        node: {
          containsAssertion: true,
          type: "ExpressionStatement",
        },
        phases: ["Arrange", "Act"],
      },
      {
        node: {
          containsMutation: true,
          type: "ExpressionStatement",
        },
        phases: ["Act", "Assert"],
      },
      {
        node: {
          containsAssertion: true,
          isValidAssert: false,
          type: "ExpressionStatement",
        },
        phases: ["Arrange", "Act", "Assert"],
      },
    ]);

    // Act
    const actualMessages = collectMessageIds(analysis);

    // Assert
    expect(actualMessages).toStrictEqual([
      "assertionOutsideAssert",
      "mutationAfterAct",
      "nonAssertionInAssert",
      "missingMeaningfulAct",
    ]);
  });

  it("accepts meaningful act content from captured or asserted act results", () => {
    // Arrange
    const analysis = createAnalysis([
      {
        node: {
          hasCapturableActResult: true,
          isSetupLike: true,
          type: "ExpressionStatement",
        },
        phases: ["Act"],
      },
      {
        node: {
          isActResultAsserted: true,
          isSetupLike: true,
          type: "ExpressionStatement",
        },
        phases: ["Act", "Assert"],
      },
    ]);

    // Act
    const actualMessages = collectMessageIds(analysis);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });
});
