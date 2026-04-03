import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MockNode } from "./rule-test-helpers";

import { createContext, createVariableDeclaration } from "./rule-test-helpers";
import { noMultipleDeclaratorsRuleMockedTypes } from "./rule.mocked-types";

/** Mocked types module shape used in these tests. */
type MockedTypesModule = Record<string, unknown>;

/** Function signature used to patch mocked type helpers. */
type TypesPatch = (actual: Record<string, unknown>) => Record<string, unknown>;

/** Active patch applied to the mocked types module. */
let activeTypesPatch: TypesPatch;

/** Range lookup call count used by the late-failure patch. */
let hasRangeCallCount: number;

/**
 * Clones the mocked types module without changing its behavior.
 * @param actual Current mocked types module.
 * @returns Cloned mocked types module.
 * @example
 * ```typescript
 * cloneTypes({ hasFixData: () => true });
 * ```
 */
function cloneTypes(actual: Record<string, unknown>): Record<string, unknown> {
  return { ...actual };
}

/**
 * Creates the mocked types module used by vi.doMock.
 * @returns Mocked types module exports.
 * @example
 * ```typescript
 * const mockedTypes = await createMockedTypesModule();
 * void mockedTypes;
 * ```
 */
async function createMockedTypesModule(): Promise<MockedTypesModule> {
  const actual: Record<string, unknown> = await vi.importActual("./types");

  return activeTypesPatch(actual);
}

/**
 * Disables fix data for the mocked types module.
 * @param types Current mocked types module.
 * @returns Patched mocked types module.
 * @example
 * ```typescript
 * disableFixData({ hasFixData: () => true });
 * ```
 */
function disableFixData(
  types: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...types,
    hasFixData: (): boolean => false,
  };
}

/**
 * Stops reporting ranges on the fourth range lookup.
 * @param types Current mocked types module.
 * @returns Patched mocked types module.
 * @example
 * ```typescript
 * disableRangeAfterFourthCheck({ hasRange: () => true });
 * ```
 */
function disableRangeAfterFourthCheck(
  types: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...types,
    hasRange: (): boolean => {
      hasRangeCallCount += 1;
      return hasRangeCallCount < 4;
    },
  };
}

/**
 * Runs the rule with a mocked types module override.
 * @param sourceText Source text used to build the mock rule context.
 * @param declaration Variable declaration node passed to the listener.
 * @param patchTypes Patch applied to the mocked types module.
 * @returns Reports emitted by the rule.
 * @example
 * ```typescript
 * const reports = await runMockedRule("const first = 1, second = 2;", createVariableDeclaration({ declaratorTexts: ["first = 1", "second = 2"], kind: "const", sourceText: "const first = 1, second = 2;", statementText: "const first = 1, second = 2;" }), cloneTypes);
 * void reports;
 * ```
 */
const runMockedRule = async (
  sourceText: string,
  declaration: MockNode,
  patchTypes: TypesPatch,
): Promise<ReturnType<typeof createContext>["reports"]> => {
  activeTypesPatch = patchTypes;
  const { noMultipleDeclaratorsRule } = await import("./rule");
  const { context, reports } = createContext(sourceText);
  const listener = noMultipleDeclaratorsRule.create(context)
    .VariableDeclaration as ((node: MockNode) => void) | undefined;

  listener?.(declaration);

  return reports;
};

describe("no-multiple-declarators rule mocked types", () => {
  beforeEach(() => {
    activeTypesPatch = cloneTypes;
    hasRangeCallCount = 0;
    vi.resetModules();
    vi.doMock(import("./types"), createMockedTypesModule);
  });

  afterEach(() => {
    vi.doUnmock("./types");
    vi.resetModules();
  });

  it("exports the companion marker", () => {
    // Arrange
    const expected = true;

    // Act
    const actual = noMultipleDeclaratorsRuleMockedTypes;

    // Assert
    expect(actual).toBe(expected);
  });

  it("skips fixes when fix data is unavailable", async () => {
    // Arrange
    const sourceText = "const first = 1, second = 2;";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });

    // Act
    const actual = await runMockedRule(sourceText, declaration, disableFixData);

    // Assert
    expect(actual[0]?.fix).toBeUndefined();
    expect(actual[0]?.messageId).toBe("singleDeclarator");
  });

  it("skips fixes when ranged declarator collection fails late", async () => {
    // Arrange
    const sourceText = "const first = 1, second = 2;";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });

    // Act
    const actual = await runMockedRule(
      sourceText,
      declaration,
      disableRangeAfterFourthCheck,
    );

    // Assert
    expect(actual[0]?.fix).toBeUndefined();
    expect(actual[0]?.messageId).toBe("singleDeclarator");
  });
});
