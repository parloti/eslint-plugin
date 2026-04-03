import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import { collectDeclarations } from "./match-declarations";

/**
 * Creates a minimal program with one `const dependency = vi.fn()` declaration.
 * @param identifierRange Source range for the identifier.
 * @param initializerRange Source range for the `vi.fn()` call.
 * @param statementRange Source range for the full declaration statement.
 * @returns Program containing one supported declaration.
 * @example
 * ```typescript
 * const program = createMockDeclarationProgram([1, 2], [3, 4], [0, 5]);
 * void program;
 * ```
 */
function createMockDeclarationProgram(
  identifierRange: [number, number],
  initializerRange: [number, number],
  statementRange: [number, number],
): ESTree.Program {
  return {
    body: [
      {
        declarations: [
          {
            id: {
              name: "dependency",
              range: identifierRange,
              type: "Identifier",
            },
            init: {
              arguments: [],
              callee: {
                computed: false,
                object: { name: "vi", type: "Identifier" },
                property: { name: "fn", type: "Identifier" },
                type: "MemberExpression",
              },
              range: initializerRange,
              type: "CallExpression",
            },
            type: "VariableDeclarator",
          },
        ],
        kind: "const",
        range: statementRange,
        type: "VariableDeclaration",
      },
    ],
    sourceType: "module",
    type: "Program",
  } as never;
}

describe("prefer-vi-mocked-import match-declarations", () => {
  it("exports collectDeclarations", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof collectDeclarations;

    // Assert
    expect(actualType).toBe(expectedType);
  });

  it("ignores malformed variable declarations without a declarator", () => {
    // Arrange
    const program = {
      body: [
        {
          declarations: [void 0],
          kind: "const",
          range: [0, 10],
          type: "VariableDeclaration",
        },
      ],
      sourceType: "module",
      type: "Program",
    } as never;

    // Act
    const declarations = collectDeclarations(program);

    // Assert
    expect(declarations.size).toBe(0);
  });

  it("ignores declarations with unsupported declarator count", () => {
    // Arrange
    const program = {
      body: [
        {
          declarations: [],
          kind: "const",
          range: [0, 10],
          type: "VariableDeclaration",
        },
      ],
      sourceType: "module",
      type: "Program",
    } as never;

    // Act
    const declarations = collectDeclarations(program);

    // Assert
    expect(declarations.size).toBe(0);
  });

  it("includes directly attached leading comments in the removal range", () => {
    // Arrange
    const program = createMockDeclarationProgram([35, 45], [48, 55], [29, 57]);
    const sourceCode = {
      getCommentsBefore: () => [
        {
          range: [0, 28],
          type: "Block",
          value: "* Mocked utility. ",
        },
      ],
      text: "/** Mocked utility. */\nconst dependency = vi.fn();\n",
    } as never;

    // Act
    const declarations = collectDeclarations(program, sourceCode);

    // Assert
    expect(declarations.get("dependency")?.statementRange).toStrictEqual([
      0, 57,
    ]);
  });

  it("keeps the statement start when a leading comment has no range", () => {
    // Arrange
    const program = createMockDeclarationProgram([8, 18], [21, 28], [0, 30]);
    const sourceCode = {
      getCommentsBefore: () => [{ type: "Block", value: "* Mocked utility. " }],
      text: "const dependency = vi.fn();\n",
    } as never;

    // Act
    const declarations = collectDeclarations(program, sourceCode);

    // Assert
    expect(declarations.get("dependency")?.statementRange).toStrictEqual([
      0, 30,
    ]);
  });

  it("keeps the statement start when comment lookup returns undefined", () => {
    // Arrange
    const program = createMockDeclarationProgram([8, 18], [21, 28], [0, 30]);
    const sourceCode = {
      getCommentsBefore: () => void 0,
      text: "const dependency = vi.fn();\n",
    } as never;

    // Act
    const declarations = collectDeclarations(program, sourceCode);

    // Assert
    expect(declarations.get("dependency")?.statementRange).toStrictEqual([
      0, 30,
    ]);
  });

  it("does not absorb comments separated by a blank line", () => {
    // Arrange
    const program = createMockDeclarationProgram([36, 46], [49, 56], [30, 58]);
    const sourceCode = {
      getCommentsBefore: () => [
        {
          range: [0, 28],
          type: "Block",
          value: "* Mocked utility. ",
        },
      ],
      text: "/** Mocked utility. */\n\nconst dependency = vi.fn();\n",
    } as never;

    // Act
    const declarations = collectDeclarations(program, sourceCode);

    // Assert
    expect(declarations.get("dependency")?.statementRange).toStrictEqual([
      30, 58,
    ]);
  });

  it("does not absorb comments when non-whitespace text separates them", () => {
    // Arrange
    const program = createMockDeclarationProgram([40, 50], [53, 60], [34, 62]);
    const sourceCode = {
      getCommentsBefore: () => [
        {
          range: [0, 28],
          type: "Block",
          value: "* Mocked utility. ",
        },
      ],
      text: "/** Mocked utility. */ code\nconst dependency = vi.fn();\n",
    } as never;

    // Act
    const declarations = collectDeclarations(program, sourceCode);

    // Assert
    expect(declarations.get("dependency")?.statementRange).toStrictEqual([
      34, 62,
    ]);
  });

  it("falls back to an empty gap when slice returns undefined", () => {
    // Arrange
    const program = createMockDeclarationProgram([35, 45], [48, 55], [29, 57]);
    const sourceCode = {
      getCommentsBefore: () => [
        {
          range: [0, 28],
          type: "Block",
          value: "* Mocked utility. ",
        },
      ],
      text: {
        slice: () => void 0,
      },
    } as never;

    // Act
    const declarations = collectDeclarations(program, sourceCode);

    // Assert
    expect(declarations.get("dependency")?.statementRange).toStrictEqual([
      0, 57,
    ]);
  });
});
