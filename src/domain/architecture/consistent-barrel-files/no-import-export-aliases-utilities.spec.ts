import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import { runRule } from "./__tests__/no-import-export-aliases-test-utilities";
import {
  createBody,
  createImportDeclaration,
  createImportSpecifier,
} from "./__tests__/test-helpers";

describe("no-import-export-aliases rule (declaration bindings)", () => {
  it("allows aliased imports when the original name is declared by a function", () => {
    // Arrange
    const body = createBody(
      {
        body: [],
        expression: false,
        generator: false,
        id: { name: "A", type: "Identifier" },
        params: [],
        type: "FunctionDeclaration",
      } as unknown as ESTree.FunctionDeclaration,
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("allows aliased imports when the original name is declared by a class", () => {
    // Arrange
    const body = createBody(
      {
        body: { body: [], type: "ClassBody" },
        id: { name: "A", type: "Identifier" },
        superClass: void 0,
        type: "ClassDeclaration",
      } as unknown as ESTree.ClassDeclaration,
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("reports aliased imports when only a type-only import binds the original name", () => {
    // Arrange
    const typeOnlyImport = {
      ...createImportDeclaration([createImportSpecifier("A")]),
      importKind: "type",
    } as unknown as ESTree.ImportDeclaration;

    const body = createBody(
      typeOnlyImport,
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("aliasNotAllowed");
  });

  it("allows aliased imports when the original name is bound in an object pattern", () => {
    // Arrange
    const variableDeclaration = {
      declarations: [
        {
          id: {
            properties: [
              {
                computed: false,
                key: { name: "source", type: "Identifier" },
                kind: "init",
                method: false,
                shorthand: false,
                type: "Property",
                value: { name: "A", type: "Identifier" },
              },
            ],
            type: "ObjectPattern",
          },
          init: { name: "source", type: "Identifier" },
          type: "VariableDeclarator",
        },
      ],
      kind: "const",
      type: "VariableDeclaration",
    } as unknown as ESTree.VariableDeclaration;

    const body = createBody(
      variableDeclaration,
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("still reports aliases when variable declarations use non-Identifier patterns", () => {
    // Arrange
    const variableDeclaration = {
      declarations: [
        {
          id: { properties: [], type: "ObjectPattern" },
          init: { raw: "source", type: "Identifier" },
          type: "VariableDeclarator",
        },
      ],
      kind: "const",
      type: "VariableDeclaration",
    } as unknown as ESTree.VariableDeclaration;

    const body = createBody(
      variableDeclaration,
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("aliasNotAllowed");
  });

  it("reports aliases when declarations use malformed pattern types", () => {
    // Arrange
    const malformedPatternDeclaration = {
      declarations: [
        {
          id: { type: "Literal", value: "A" },
          init: { name: "values", type: "Identifier" },
          type: "VariableDeclarator",
        },
      ],
      kind: "const",
      type: "VariableDeclaration",
    } as unknown as ESTree.VariableDeclaration;
    const body = createBody(
      malformedPatternDeclaration,
      createImportDeclaration([createImportSpecifier("RenamedA", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([{ messageId: "aliasNotAllowed" }]);
  });

  it("allows aliases when original names are bound via assignment, rest, and array patterns", () => {
    // Arrange
    const sparseElement = JSON.parse("null") as unknown as ESTree.Pattern;
    const complexDeclaration = {
      declarations: [
        {
          id: {
            elements: [
              {
                left: { name: "A", type: "Identifier" },
                right: { name: "fallback", type: "Identifier" },
                type: "AssignmentPattern",
              },
              {
                argument: { name: "B", type: "Identifier" },
                type: "RestElement",
              },
              sparseElement,
            ],
            type: "ArrayPattern",
          },
          init: { name: "values", type: "Identifier" },
          type: "VariableDeclarator",
        },
        {
          id: {
            properties: [
              {
                argument: { name: "C", type: "Identifier" },
                type: "RestElement",
              },
            ],
            type: "ObjectPattern",
          },
          init: { name: "source", type: "Identifier" },
          type: "VariableDeclarator",
        },
      ],
      kind: "const",
      type: "VariableDeclaration",
    } as unknown as ESTree.VariableDeclaration;
    const body = createBody(
      complexDeclaration,
      createImportDeclaration([createImportSpecifier("RenamedA", "A")]),
      createImportDeclaration([createImportSpecifier("RenamedB", "B")]),
      createImportDeclaration([createImportSpecifier("RenamedC", "C")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("tracks named export declarations and ignores anonymous default declarations", () => {
    // Arrange
    const body = createBody(
      {
        declaration: {
          body: [],
          expression: false,
          generator: false,
          id: { name: "A", type: "Identifier" },
          params: [],
          type: "FunctionDeclaration",
        },
        specifiers: [],
        type: "ExportNamedDeclaration",
      } as unknown as ESTree.ExportNamedDeclaration,
      {
        declaration: {
          body: { body: [], type: "ClassBody" },
          id: { name: "B", type: "Identifier" },
          superClass: void 0,
          type: "ClassDeclaration",
        },
        specifiers: [],
        type: "ExportNamedDeclaration",
      } as unknown as ESTree.ExportNamedDeclaration,
      {
        declaration: {
          body: [],
          expression: false,
          generator: false,
          id: { name: "C", type: "Identifier" },
          params: [],
          type: "FunctionDeclaration",
        },
        type: "ExportDefaultDeclaration",
      } as unknown as ESTree.ExportDefaultDeclaration,
      {
        declaration: {
          body: { body: [], type: "ClassBody" },
          id: { name: "D", type: "Identifier" },
          superClass: void 0,
          type: "ClassDeclaration",
        },
        type: "ExportDefaultDeclaration",
      } as unknown as ESTree.ExportDefaultDeclaration,
      {
        declaration: {
          body: [],
          expression: false,
          generator: false,
          id: void 0,
          params: [],
          type: "FunctionDeclaration",
        },
        type: "ExportDefaultDeclaration",
      } as unknown as ESTree.ExportDefaultDeclaration,
      createImportDeclaration([createImportSpecifier("RenamedA", "A")]),
      createImportDeclaration([createImportSpecifier("RenamedB", "B")]),
      createImportDeclaration([createImportSpecifier("RenamedC", "C")]),
      createImportDeclaration([createImportSpecifier("RenamedD", "D")]),
      createImportDeclaration([
        createImportSpecifier("RenamedMissing", "Missing"),
      ]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([{ messageId: "aliasNotAllowed" }]);
  });
});
