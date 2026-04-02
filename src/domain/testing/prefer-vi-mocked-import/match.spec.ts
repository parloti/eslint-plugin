import { describe, expect, expectTypeOf, it } from "vitest";

import { collectMatch } from "./match";

/** Type definition for rule data. */
interface TestContext {
  /** Minimal sourceCode payload used by collectMatch. */
  sourceCode: {
    /** Program AST node. */
    ast: unknown;

    /** Original source text. */
    text: string;
  };
}

/**
 * Creates a minimal rule context for collectMatch tests.
 * @param ast Program-like AST payload.
 * @returns Minimal context object.
 * @example
 * ```typescript
 * const context = createContext({ body: [], sourceType: "module", type: "Program" });
 * void context;
 * ```
 */
function createContext(ast: unknown): TestContext {
  return {
    sourceCode: {
      ast,
      text: "",
    },
  };
}

describe("prefer-vi-mocked-import match", () => {
  it("exports collectMatch", () => {
    // Arrange

    // Act & Assert
    expectTypeOf(collectMatch).toBeFunction();
  });

  it("returns undefined when no top-level mock call exists", () => {
    // Arrange
    const context = createContext({
      body: [{ type: "EmptyStatement" }],
      sourceType: "module",
      type: "Program",
    }) as never;

    // Act
    const match = collectMatch(context);

    // Assert
    expect(match).toBe(void 0);
  });

  it("returns undefined when find returns a non-call expression statement", () => {
    // Arrange
    const context = createContext({
      body: {
        find: () => ({
          expression: { name: "x", type: "Identifier" },
          type: "ExpressionStatement",
        }),
      },
    }) as never;

    // Act
    const match = collectMatch(context);

    // Assert
    expect(match).toBe(void 0);
  });

  it("returns undefined for mock calls with missing arguments", () => {
    // Arrange
    const context = createContext({
      body: [
        {
          expression: {
            arguments: [],
            callee: {
              computed: false,
              object: { name: "vi", type: "Identifier" },
              property: { name: "mock", type: "Identifier" },
              type: "MemberExpression",
            },
            type: "CallExpression",
          },
          type: "ExpressionStatement",
        },
      ],
      sourceType: "module",
      type: "Program",
    }) as never;

    // Act
    const match = collectMatch(context);

    // Assert
    expect(match).toBe(void 0);
  });

  it("returns undefined for spread mock arguments", () => {
    // Arrange
    const context = createContext({
      body: [
        {
          expression: {
            arguments: [
              {
                argument: { name: "module", type: "Identifier" },
                type: "SpreadElement",
              },
              {
                body: { properties: [], type: "ObjectExpression" },
                type: "ArrowFunctionExpression",
              },
            ],
            callee: {
              computed: false,
              object: { name: "vi", type: "Identifier" },
              property: { name: "mock", type: "Identifier" },
              type: "MemberExpression",
            },
            type: "CallExpression",
          },
          type: "ExpressionStatement",
        },
      ],
      sourceType: "module",
      type: "Program",
    }) as never;

    // Act
    const match = collectMatch(context);

    // Assert
    expect(match).toBe(void 0);
  });

  it("returns undefined when specifier expression has no range", () => {
    // Arrange
    const context = createContext({
      body: [
        {
          expression: {
            arguments: [
              { type: "Literal", value: "./mod" },
              {
                body: { properties: [], type: "ObjectExpression" },
                type: "ArrowFunctionExpression",
              },
            ],
            callee: {
              computed: false,
              object: { name: "vi", type: "Identifier" },
              property: { name: "mock", type: "Identifier" },
              type: "MemberExpression",
            },
            type: "CallExpression",
          },
          type: "ExpressionStatement",
        },
      ],
      sourceType: "module",
      type: "Program",
    }) as never;

    // Act
    const match = collectMatch(context);

    // Assert
    expect(match).toBe(void 0);
  });

  it("ignores call expressions that are not member invocations", () => {
    // Arrange
    const context = createContext({
      body: [
        {
          expression: {
            arguments: [],
            callee: { name: "mock", type: "Identifier" },
            type: "CallExpression",
          },
          type: "ExpressionStatement",
        },
      ],
      sourceType: "module",
      type: "Program",
    }) as never;

    // Act
    const match = collectMatch(context);

    // Assert
    expect(match).toBe(void 0);
  });
});
