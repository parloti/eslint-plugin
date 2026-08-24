import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import { runRule } from "./__tests__/no-import-export-aliases-test-utilities";
import {
  createBody,
  createExportSpecifier,
  createExportWithoutSource,
  createImportDeclaration,
  createImportSpecifier,
} from "./__tests__/test-helpers";

describe("no-import-export-aliases rule", () => {
  it("reports aliased named imports without collisions", () => {
    // Arrange
    const body = createBody(
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("aliasNotAllowed");
  });

  it("allows aliased named imports when the original name is already imported", () => {
    // Arrange
    const body = createBody(
      createImportDeclaration([createImportSpecifier("A")]),
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("reports aliased named exports without collisions", () => {
    // Arrange
    const body = createBody(
      createExportWithoutSource([createExportSpecifier("A", "B")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("aliasNotAllowed");
  });

  it("allows aliased named exports when the original name is already imported", () => {
    // Arrange
    const body = createBody(
      createImportDeclaration([createImportSpecifier("A")]),
      createExportWithoutSource([createExportSpecifier("A", "B")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("reports aliasing from export-from declarations when no collision exists", () => {
    // Arrange
    const body = createBody({
      attributes: [],
      source: { raw: "'./dependency'", type: "Literal", value: "./dependency" },
      specifiers: [createExportSpecifier("A", "B")],
      type: "ExportNamedDeclaration",
    });

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("aliasNotAllowed");
  });

  it("does not report non-aliased named imports and exports", () => {
    // Arrange
    const body = createBody(
      createImportDeclaration([createImportSpecifier("A")]),
      createExportWithoutSource([createExportSpecifier("A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("does not report default or namespace imports", () => {
    // Arrange
    const body = createBody(
      createImportDeclaration([
        {
          local: { name: "Feature", type: "Identifier" },
          type: "ImportDefaultSpecifier",
        },
        {
          local: { name: "featureNamespace", type: "Identifier" },
          type: "ImportNamespaceSpecifier",
        },
      ]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("allows aliased imports when the original name is already declared in a variable", () => {
    // Arrange
    const variableDeclaration = {
      declarations: [
        {
          id: { name: "A", type: "Identifier" },
          init: { raw: "1", type: "Literal", value: 1 },
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

  it("allows aliased exports when the original name is already declared by an exported variable", () => {
    // Arrange
    const body = createBody(
      {
        declaration: {
          declarations: [
            {
              id: { name: "A", type: "Identifier" },
              init: { raw: "1", type: "Literal", value: 1 },
              type: "VariableDeclarator",
            },
          ],
          kind: "const",
          type: "VariableDeclaration",
        },
        specifiers: [],
        type: "ExportNamedDeclaration",
      } as unknown as ESTree.ExportNamedDeclaration,
      createExportWithoutSource([createExportSpecifier("A", "B")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });
});
