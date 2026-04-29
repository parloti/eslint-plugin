import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { phasePurityReportingBehaviorCombinedCompanion } from "./phase-purity-reporting.behavior.combined";

/** Node flag used by mocked identifier predicates. */
interface MockAssertedFlag {
  /** Whether the node result is treated as asserted. */
  asserted?: boolean;
}

/** Assertion-related flags used by the mocked AAA helpers. */
interface MockAssertionFlags {
  /** Whether the node is treated as an assertion. */
  assertion?: boolean;
  /** Whether the node is treated as capturable. */
  capturable?: boolean;
  /** Whether the node is treated as valid assert logic. */
  validAssert?: boolean;
}

describe("enforce-aaa-phase-purity reporting behavior combined sections", () => {
  beforeEach(() => {
    const activeAssertIdentifiers = new Set(["actualResult"]);

    vi.resetModules();
    vi.doMock(import("../aaa"), () => ({
      hasAssertion: (node: ESTree.Statement): boolean =>
        (node as MockAssertionFlags).assertion === true,
      hasAsyncLogic: (): boolean => false,
      hasAwait: (): boolean => false,
      hasCapturableActResult: (node: ESTree.Statement): boolean =>
        (node as MockAssertionFlags).capturable === true,
      hasMutation: (): boolean => false,
      isMeaningfulActStatement: (): boolean => false,
      isSetupLikeStatement: (): boolean => false,
      isValidAssertStatement: (node: ESTree.Statement): boolean =>
        (node as MockAssertionFlags).validAssert === true,
    }));
    vi.doMock(import("./phase-purity-identifiers"), () => ({
      getAssertReferencedIdentifiers: (): Set<string> =>
        activeAssertIdentifiers,
      isActResultAsserted: (
        _identifiers: Set<string>,
        node: ESTree.Statement,
      ): boolean => (node as MockAssertedFlag).asserted === true,
    }));
  });

  it("reports evaluated assertion expressions in combined Act and Assert sections", async () => {
    // Arrange
    const combinedNode = {
      assertion: true,
      capturable: true,
      type: "ExpressionStatement",
      validAssert: false,
    };
    const analysis = {
      callExpression: { type: "CallExpression" },
      sectionComments: [{ phases: ["Arrange"] }, { phases: ["Act", "Assert"] }],
      statements: [
        { node: { type: "ExpressionStatement" }, phases: ["Arrange"] },
        { node: combinedNode, phases: ["Act", "Assert"] },
      ],
    };
    const reports: Rule.ReportDescriptor[] = [];
    const context = {
      report: (descriptor: Rule.ReportDescriptor): void => {
        reports.push(descriptor);
      },
    } as Rule.RuleContext;

    // Act
    const actual = await (async (): Promise<Rule.ReportDescriptor[]> => {
      const { reportPhasePurityViolations } =
        await import("./phase-purity-reporting");

      reportPhasePurityViolations(context, analysis as never);

      return reports;
    })();

    // Assert
    expect(phasePurityReportingBehaviorCombinedCompanion).toBe(true);
    expect(actual).toStrictEqual([
      { messageId: "nonAssertionInAssert", node: combinedNode },
    ]);
  });
});
