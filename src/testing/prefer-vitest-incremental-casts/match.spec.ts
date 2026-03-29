import { TSESTree } from "@typescript-eslint/utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import { collectMatch } from "./match";

/**
 * Loads the match module after the current mocks are registered and runs collectMatch.
 * @param context Match context passed to collectMatch.
 * @returns Result returned by collectMatch.
 * @example
 * ```typescript
 * const actual = await loadCollectMatch({} as Parameters<typeof collectMatch>[0]);
 * void actual;
 * ```
 */
const loadCollectMatch = async (
  context: Parameters<typeof collectMatch>[0],
): Promise<ReturnType<typeof collectMatch>> => {
  const matchModule = await import("./match");

  return matchModule.collectMatch(context);
};

describe("prefer-vitest-incremental-casts match", () => {
  afterEach(() => {
    vi.doUnmock("./ast-helpers");
    vi.doUnmock("./match-input");
    vi.doUnmock("./replacement-helpers");
    vi.doUnmock("./type-helpers");
    vi.resetModules();
  });

  it("skips non-Vitest calls", () => {
    // Arrange
    const context = {
      callExpression: {
        arguments: [],
        callee: {
          name: "mock",
          type: TSESTree.AST_NODE_TYPES.Identifier,
        },
        type: TSESTree.AST_NODE_TYPES.CallExpression,
      } as never,
      checker: {} as never,
      services: {} as never,
      sourceText: "",
    };

    // Act
    const actual = collectMatch(context);

    // Assert
    expect(actual).toBeUndefined();
  });

  it("wraps implicit object returns when needed", async () => {
    // Arrange
    vi.resetModules();
    vi.doMock(
      import("./ast-helpers"),
      (): never =>
        ({
          getPropertyName: (): string => "parser",
          isSupportedProperty: (): boolean => true,
          shouldWrapImplicitObject: (): boolean => true,
        }) as never,
    );
    vi.doMock(
      import("./match-input"),
      (): never =>
        ({
          getFactoryMatchInput: (): unknown => ({
            factoryArgument: { type: "ArrowFunctionExpression" },
            moduleSpecifier: "fixture-module",
            objectExpression: { properties: [{ key: {} }], range: [0, 10] },
            returnExpression: { range: [0, 10] },
          }),
        }) as never,
    );
    vi.doMock(
      import("./replacement-helpers"),
      (): never =>
        ({
          applyTextReplacements: (): string => "{ parser }",
          buildPropertyReplacement: (): undefined => void 0,
        }) as never,
    );
    vi.doMock(
      import("./type-helpers"),
      (): never =>
        ({
          isOuterCastRequired: (): boolean => false,
          resolveFactoryTargetType: (): unknown => ({ type: "target" }),
        }) as never,
    );

    // Act
    const actual = await loadCollectMatch({
      callExpression: { type: "CallExpression" } as never,
      checker: {
        getPropertiesOfType: () => [{ getName: (): string => "parser" }],
      } as never,
      services: {} as never,
      sourceText: "{ parser }",
    });

    // Assert
    expect(actual).toStrictEqual({
      replacementText: "({ parser })",
      returnExpressionRange: [0, 10],
    });
  });

  it("returns the plain object text when no extra wrapping is needed", async () => {
    // Arrange
    vi.resetModules();
    vi.doMock(
      import("./ast-helpers"),
      (): never =>
        ({
          getPropertyName: (): string => "parser",
          isSupportedProperty: (): boolean => true,
          shouldWrapImplicitObject: (): boolean => false,
        }) as never,
    );
    vi.doMock(
      import("./match-input"),
      (): never =>
        ({
          getFactoryMatchInput: (): unknown => ({
            factoryArgument: { type: "ArrowFunctionExpression" },
            moduleSpecifier: "fixture-module",
            objectExpression: { properties: [{ key: {} }], range: [0, 10] },
            returnExpression: { range: [0, 10] },
          }),
        }) as never,
    );
    vi.doMock(
      import("./replacement-helpers"),
      (): never =>
        ({
          applyTextReplacements: (): string => "{ parser }",
          buildPropertyReplacement: (): undefined => void 0,
        }) as never,
    );
    vi.doMock(
      import("./type-helpers"),
      (): never =>
        ({
          isOuterCastRequired: (): boolean => false,
          resolveFactoryTargetType: (): unknown => ({ type: "target" }),
        }) as never,
    );

    // Act
    const actual = await loadCollectMatch({
      callExpression: { type: "CallExpression" } as never,
      checker: {
        getPropertiesOfType: () => [{ getName: (): string => "parser" }],
      } as never,
      services: {} as never,
      sourceText: "{ parser }",
    });

    // Assert
    expect(actual).toBeUndefined();
  });
});
