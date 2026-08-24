import { describe, expect, it } from "vitest";

import type { LoadRuleInput } from "./rule-test-helpers";

import {
  createAnalysisModule,
  createAssertionsModule,
  loadRule,
} from "./rule-test-helpers";

/** Assertion flag pair captured from the mocked helper module. */
interface CapturedAssertionFlags {
  /** Flag for a configured assertion node. */
  known: boolean;

  /** Flag for an unconfigured node. */
  unknown: boolean;
}

/**
 * Builds an empty mocked analysis input for helper tests.
 * @returns Empty mocked analysis input.
 * @example
 * ```typescript
 * const input = createEmptyLoadRuleInput();
 * ```
 */
const createEmptyLoadRuleInput = (): LoadRuleInput =>
  ({
    analysis: void 0,
    assertionIdentifiers: new Map(),
    assertionNodes: new Set(),
    declaredIdentifiers: new Map(),
  }) satisfies LoadRuleInput;

/**
 * Loads the mock state and captures the mocked analyzer result.
 * @param input Mocked analysis state to activate.
 * @returns Analysis value returned by the analyzer mock.
 * @example
 * ```typescript
 * const analysis = await captureAnalyzerResult(createEmptyLoadRuleInput());
 * ```
 */
const captureAnalyzerResult = async (
  input: LoadRuleInput,
): Promise<unknown> => {
  await loadRule(input);

  return createAnalysisModule().analyzeTestBlock();
};

/**
 * Loads the mock state and captures identifiers for one assertion node.
 * @param input Mocked analysis state to activate.
 * @param assertionNode Node looked up in the identifier map.
 * @returns Identifier pair returned by the assertions mock.
 * @example
 * ```typescript
 * const identifiers = await captureAssertionIdentifiers(input, {});
 * ```
 */
const captureAssertionIdentifiers = async (
  input: LoadRuleInput,
  assertionNode: unknown,
): Promise<unknown> => {
  await loadRule(input);

  return createAssertionsModule().getAssertionIdentifiers(assertionNode);
};

/**
 * Loads the mock state and captures hasAssertion flags for two nodes.
 * @param input Mocked analysis state to activate.
 * @param knownNode Node included in the configured assertion set.
 * @returns Flags for the configured and unconfigured nodes.
 * @example
 * ```typescript
 * const flags = await captureAssertionFlags(input, node);
 * ```
 */
const captureAssertionFlags = async (
  input: LoadRuleInput,
  knownNode: unknown,
): Promise<CapturedAssertionFlags> => {
  const assertionsModule = createAssertionsModule();

  await loadRule(input);

  return {
    known: assertionsModule.hasAssertion(knownNode),
    unknown: assertionsModule.hasAssertion({}),
  };
};

describe("assert-actual-expected-names rule-test-helpers", () => {
  it("exposes the configured analysis through the analyzer mock", async () => {
    // Arrange
    const analysis = { statements: [] };
    const input = {
      ...createEmptyLoadRuleInput(),
      analysis,
    } satisfies LoadRuleInput;

    // Act
    const actualAnalysis = await captureAnalyzerResult(input);

    // Assert
    expect(actualAnalysis).toBe(analysis);
  });

  it("reads stored assertion identifiers through the assertions mock", async () => {
    // Arrange
    const assertionNode = { type: "ExpressionStatement" };
    const input = {
      ...createEmptyLoadRuleInput(),
      assertionIdentifiers: new Map([
        [assertionNode, { actual: "result", expected: "value" }],
      ]),
    } satisfies LoadRuleInput;

    // Act
    const actualIdentifiers = await captureAssertionIdentifiers(
      input,
      assertionNode,
    );

    // Assert
    expect(actualIdentifiers).toStrictEqual({
      actual: "result",
      expected: "value",
    });
  });

  it("falls back to undefined identifiers for unknown nodes", async () => {
    // Arrange
    const input = createEmptyLoadRuleInput();

    // Act
    const actualIdentifiers = await captureAssertionIdentifiers(input, {});

    // Assert
    expect(actualIdentifiers).toStrictEqual({
      actual: void 0,
      expected: void 0,
    });
  });

  it("reflects configured assertion nodes through hasAssertion", async () => {
    // Arrange
    const assertionNode = { type: "ExpressionStatement" };
    const input = {
      ...createEmptyLoadRuleInput(),
      assertionNodes: new Set([assertionNode]),
    } satisfies LoadRuleInput;

    // Act
    const actualFlags = await captureAssertionFlags(input, assertionNode);

    // Assert
    expect(actualFlags).toStrictEqual({ known: true, unknown: false });
  });

  it("checks actual and expected prefixes through usesPrefix", () => {
    // Arrange
    const assertionsModule = createAssertionsModule();

    // Act
    const actualPrefixChecks = [
      assertionsModule.usesPrefix("actualResult", "actual"),
      assertionsModule.usesPrefix("result", "expected"),
    ];

    // Assert
    expect(actualPrefixChecks).toStrictEqual([true, false]);
  });
});
