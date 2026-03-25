import { describe, expect, it } from "vitest";

import { collectDeclarations } from "./match-declarations";

describe("prefer-vi-mocked-import match-declarations", () => {
  it("exports collectDeclarations", () => {
    // Arrange

    // Act & Assert
    expect(collectDeclarations).toBeTypeOf("function");
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
    const program = {
      body: [
        {
          declarations: [
            {
              id: { name: "dependency", range: [35, 45], type: "Identifier" },
              init: {
                arguments: [],
                callee: {
                  computed: false,
                  object: { name: "vi", type: "Identifier" },
                  property: { name: "fn", type: "Identifier" },
                  type: "MemberExpression",
                },
                range: [48, 55],
                type: "CallExpression",
              },
              type: "VariableDeclarator",
            },
          ],
          kind: "const",
          range: [29, 57],
          type: "VariableDeclaration",
        },
      ],
      sourceType: "module",
      type: "Program",
    } as never;
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
    const program = {
      body: [
        {
          declarations: [
            {
              id: { name: "dependency", range: [8, 18], type: "Identifier" },
              init: {
                arguments: [],
                callee: {
                  computed: false,
                  object: { name: "vi", type: "Identifier" },
                  property: { name: "fn", type: "Identifier" },
                  type: "MemberExpression",
                },
                range: [21, 28],
                type: "CallExpression",
              },
              type: "VariableDeclarator",
            },
          ],
          kind: "const",
          range: [0, 30],
          type: "VariableDeclaration",
        },
      ],
      sourceType: "module",
      type: "Program",
    } as never;
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
    const program = {
      body: [
        {
          declarations: [
            {
              id: { name: "dependency", range: [8, 18], type: "Identifier" },
              init: {
                arguments: [],
                callee: {
                  computed: false,
                  object: { name: "vi", type: "Identifier" },
                  property: { name: "fn", type: "Identifier" },
                  type: "MemberExpression",
                },
                range: [21, 28],
                type: "CallExpression",
              },
              type: "VariableDeclarator",
            },
          ],
          kind: "const",
          range: [0, 30],
          type: "VariableDeclaration",
        },
      ],
      sourceType: "module",
      type: "Program",
    } as never;
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
    const program = {
      body: [
        {
          declarations: [
            {
              id: { name: "dependency", range: [36, 46], type: "Identifier" },
              init: {
                arguments: [],
                callee: {
                  computed: false,
                  object: { name: "vi", type: "Identifier" },
                  property: { name: "fn", type: "Identifier" },
                  type: "MemberExpression",
                },
                range: [49, 56],
                type: "CallExpression",
              },
              type: "VariableDeclarator",
            },
          ],
          kind: "const",
          range: [30, 58],
          type: "VariableDeclaration",
        },
      ],
      sourceType: "module",
      type: "Program",
    } as never;
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
    const program = {
      body: [
        {
          declarations: [
            {
              id: { name: "dependency", range: [40, 50], type: "Identifier" },
              init: {
                arguments: [],
                callee: {
                  computed: false,
                  object: { name: "vi", type: "Identifier" },
                  property: { name: "fn", type: "Identifier" },
                  type: "MemberExpression",
                },
                range: [53, 60],
                type: "CallExpression",
              },
              type: "VariableDeclarator",
            },
          ],
          kind: "const",
          range: [34, 62],
          type: "VariableDeclaration",
        },
      ],
      sourceType: "module",
      type: "Program",
    } as never;
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
    const program = {
      body: [
        {
          declarations: [
            {
              id: { name: "dependency", range: [35, 45], type: "Identifier" },
              init: {
                arguments: [],
                callee: {
                  computed: false,
                  object: { name: "vi", type: "Identifier" },
                  property: { name: "fn", type: "Identifier" },
                  type: "MemberExpression",
                },
                range: [48, 55],
                type: "CallExpression",
              },
              type: "VariableDeclarator",
            },
          ],
          kind: "const",
          range: [29, 57],
          type: "VariableDeclaration",
        },
      ],
      sourceType: "module",
      type: "Program",
    } as never;
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
