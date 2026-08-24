import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AnalyzerAsserionsHelpersModule from "../aaa/analyzer.assertions.helpers";
import type * as AnalyzerClassificationHelpers from "../aaa/analyzer.classification.helpers";
import type { NodeFlags } from "./__tests__/phase-purity-reporting-test-helpers";
import type * as PhasePurityIdentifiersModule from "./phase-purity-identifiers";

import {
  collectMessageIds,
  createAnalysis,
  hasFlag,
} from "./__tests__/phase-purity-reporting-test-helpers";
import { reportPhasePurityViolations } from "./phase-purity-reporting";

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
    isActResultAsserted: (_assertReferences: Set<string>, node: NodeFlags) =>
      hasFlag(node, "isActResultAsserted"),
  }),
);

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
