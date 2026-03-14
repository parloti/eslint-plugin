import { describe, expect, it } from "vitest";

import { resolveImportPlan } from "./match-imports";

describe("prefer-vi-mocked-import match-imports", () => {
  it("exports resolveImportPlan", () => {
    expect(resolveImportPlan).toBeTypeOf("function");
  });

  it("returns insert plan after namespace import for same module", () => {
    const plan = resolveImportPlan(
      {
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
      } as never,
      "./mod",
      ["a"],
    );

    expect(plan).toStrictEqual({
      insert: { afterRange: [0, 25] },
      moduleSpecifier: "./mod",
      names: ["a"],
    });
  });

  it("returns update plan preserving default and existing named imports", () => {
    const plan = resolveImportPlan(
      {
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
      } as never,
      "./mod",
      ["a"],
    );

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
    const plan = resolveImportPlan(
      {
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
      } as never,
      "./mod",
      ["a"],
    );

    expect(plan).toStrictEqual({
      insert: { afterRange: [0, 30] },
      moduleSpecifier: "./mod",
      names: ["a"],
    });
  });
});
