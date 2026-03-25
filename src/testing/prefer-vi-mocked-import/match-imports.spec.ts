import { describe, expect, it } from "vitest";

import { resolveImportPlan } from "./match-imports";

describe("prefer-vi-mocked-import match-imports", () => {
  it("exports resolveImportPlan", () => {
    // Arrange

    // Act & Assert
    expect(typeof resolveImportPlan).toBe("function");
  });

  it("returns insert plan after namespace import for same module", () => {
    // Arrange
    const program = {
      body: [
        {
          range: [0, 25],
          source: { type: "Literal", value: "./mod" },
          specifiers: [
            {
              local: { name: "mod" },
              type: "ImportNamespaceSpecifier",
            },
          ],
          type: "ImportDeclaration",
        },
      ],
      sourceType: "module",
      type: "Program",
    } as never;

    // Act
    const plan = resolveImportPlan(program, "./mod", ["a"]);

    // Assert
    expect(plan).toStrictEqual({
      insert: { afterRange: [0, 25] },
      moduleSpecifier: "./mod",
      names: ["a"],
    });
  });

  it("returns update plan preserving default and existing named imports", () => {
    // Arrange
    const program = {
      body: [
        {
          range: [0, 30],
          source: { type: "Literal", value: "./mod" },
          specifiers: [
            {
              local: { name: "mod" },
              type: "ImportDefaultSpecifier",
            },
            {
              imported: { name: "existing", type: "Identifier" },
              type: "ImportSpecifier",
            },
          ],
          type: "ImportDeclaration",
        },
      ],
      sourceType: "module",
      type: "Program",
    } as never;

    // Act
    const plan = resolveImportPlan(program, "./mod", ["a"]);

    // Assert
    expect(plan).toStrictEqual({
      moduleSpecifier: "./mod",
      names: ["a"],
      update: {
        defaultImportName: "mod",
        existingNamedImports: ["existing"],
        range: [0, 30],
      },
    });
  });

  it("inserts when import source is not a string literal", () => {
    // Arrange
    const program = {
      body: [
        {
          range: [0, 30],
          source: { type: "Literal", value: 123 },
          specifiers: [
            {
              imported: { name: "existing", type: "Identifier" },
              type: "ImportSpecifier",
            },
          ],
          type: "ImportDeclaration",
        },
      ],
      sourceType: "module",
      type: "Program",
    } as never;

    // Act
    const plan = resolveImportPlan(program, "./mod", ["a"]);

    // Assert
    expect(plan).toStrictEqual({
      insert: { afterRange: [0, 30] },
      moduleSpecifier: "./mod",
      names: ["a"],
    });
  });
});
