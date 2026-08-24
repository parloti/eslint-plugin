import type { AST, Rule } from "eslint";

import { SourceCode } from "eslint";
import path from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

import { parseProgram } from "./__tests__/no-unused-exports-utilities-test-helpers";
import { collectExportedElements } from "./no-unused-exports-declaration-utilities";
import { getOptions } from "./no-unused-exports-options";
import { getTypeScriptProgram } from "./no-unused-exports-utilities";

describe("no-unused-exports export collection", () => {
  it("collects declaration-owned exported elements with value/type kinds", () => {
    // Arrange
    const program = parseProgram(
      [
        "export const value = 1;",
        "export type Alias = string;",
        "export interface Shape { readonly size: number; }",
        "const localValue = value;",
        "export { value as renamed };",
        "export { localValue as localAlias };",
        "export { helper } from './helper';",
        "export * from './feature';",
        "export default value;",
      ].join("\n"),
    );

    // Act
    const actualExportData = collectExportedElements(program.body).map(
      (element) => ({
        exportedName: element.exportedName,
        exportKind: element.exportKind,
      }),
    );

    // Assert
    expect(actualExportData).toStrictEqual([
      { exportedName: "value", exportKind: "value" },
      { exportedName: "Alias", exportKind: "type" },
      { exportedName: "Shape", exportKind: "type" },
      { exportedName: "renamed", exportKind: "value" },
      { exportedName: "localAlias", exportKind: "value" },
      { exportedName: "default", exportKind: "value" },
    ]);
  });

  it("classifies type-only export specifiers and reports the declaration node", () => {
    // Arrange
    const program = parseProgram(
      [
        "interface Shape { readonly size: number; }",
        "const valueOnly = 1;",
        "export type { Shape };",
        "export { valueOnly as valueAlias };",
        "export type { valueOnly as ShapeAlias };",
      ].join("\n"),
    );

    // Act
    const actualExportData = collectExportedElements(program.body).map(
      (element) => ({
        exportedName: element.exportedName,
        exportKind: element.exportKind,
        nodeType: element.node.type,
      }),
    );

    // Assert
    expect(actualExportData).toStrictEqual([
      {
        exportedName: "Shape",
        exportKind: "type",
        nodeType: "TSInterfaceDeclaration",
      },
      {
        exportedName: "valueAlias",
        exportKind: "value",
        nodeType: "VariableDeclaration",
      },
      {
        exportedName: "ShapeAlias",
        exportKind: "type",
        nodeType: "VariableDeclaration",
      },
    ]);
  });

  it("ignores malformed declaration candidates while collecting local names", () => {
    // Arrange
    const malformedBody = [
      {
        declaration: {
          id: { name: "broken" },
        },
        source: void 0,
        specifiers: [],
        type: "ExportNamedDeclaration",
      },
      {
        declarations: [void 0],
        kind: "const",
        type: "VariableDeclaration",
      },
    ] as unknown as AST.Program["body"];

    // Act
    const actualExportedElements = collectExportedElements(malformedBody).map(
      (element) => ({
        exportedName: element.exportedName,
        exportKind: element.exportKind,
      }),
    );

    // Assert
    expect(actualExportedElements).toStrictEqual([
      {
        exportedName: "broken",
        exportKind: "value",
      },
    ]);
  });

  it("collects exported names from pattern-based declarations", () => {
    // Arrange
    const program = parseProgram(
      [
        "const source = { alias: 1, nested: { inner: 2 }, list: [3] };",
        "export const [first, second = source.alias, ...rest] = source.list;",
        "export const { alias: renamed, nested: { inner }, ...others } = source;",
        "export function buildFeature() {}",
        "export class FeatureClass {}",
        "export enum FeatureEnum { A }",
        "export interface FeatureShape { readonly id: string; }",
        "export type FeatureAlias = string;",
      ].join("\n"),
    );

    // Act
    const actualExportData = collectExportedElements(program.body).map(
      (element) => ({
        exportedName: element.exportedName,
        exportKind: element.exportKind,
      }),
    );

    // Assert
    expect(actualExportData).toStrictEqual([
      { exportedName: "first", exportKind: "value" },
      { exportedName: "second", exportKind: "value" },
      { exportedName: "rest", exportKind: "value" },
      { exportedName: "renamed", exportKind: "value" },
      { exportedName: "inner", exportKind: "value" },
      { exportedName: "others", exportKind: "value" },
      { exportedName: "buildFeature", exportKind: "value" },
      { exportedName: "FeatureClass", exportKind: "value" },
      { exportedName: "FeatureEnum", exportKind: "value" },
      { exportedName: "FeatureShape", exportKind: "type" },
      { exportedName: "FeatureAlias", exportKind: "type" },
    ]);
  });

  it("ignores pass-through re-exports and non-local export specifiers", () => {
    // Arrange
    const program = parseProgram(
      [
        "import { external } from './external';",
        "const local = 1;",
        "export { external as renamedExternal, local as renamedLocal };",
        "export { external as passThrough } from './external';",
        "export * from './external';",
      ].join("\n"),
    );

    // Act
    const actualExportedNames = collectExportedElements(program.body).map(
      (element) => element.exportedName,
    );

    // Assert
    expect(actualExportedNames).toStrictEqual(["renamedLocal"]);
  });

  it("skips malformed export declarations that do not provide names", () => {
    // Arrange
    const malformedBody = [
      {
        declaration: {
          type: "FunctionDeclaration",
        },
        specifiers: [],
        type: "ExportNamedDeclaration",
      },
      {
        declaration: {
          type: "VariableDeclaration",
        },
        specifiers: [],
        type: "ExportNamedDeclaration",
      },
      {
        declaration: void 0,
        source: {
          type: "Literal",
          value: "./feature",
        },
        specifiers: [
          {
            exported: {
              type: "Literal",
              value: "renamed",
            },
            local: {
              type: "Literal",
              value: "local",
            },
            type: "ExportSpecifier",
          },
        ],
        type: "ExportNamedDeclaration",
      },
      {
        declaration: void 0,
        source: void 0,
        specifiers: [
          {
            exported: {
              type: "Literal",
              value: "renamed",
            },
            local: {
              type: "Literal",
              value: "local",
            },
            type: "ExportSpecifier",
          },
        ],
        type: "ExportNamedDeclaration",
      },
    ] as unknown as AST.Program["body"];

    // Act
    const actualExportedElements = collectExportedElements(malformedBody);

    // Assert
    expect(actualExportedElements).toStrictEqual([]);
  });

  it("returns no TypeScript program without parser services", () => {
    // Arrange
    const sourceCode = new SourceCode(
      "",
      parseProgram("export const value = 1;"),
    );
    const context = {
      filename: path.join(cwd(), "src", "feature.ts"),
      options: [getOptions([])],
      report: () => {
        throw new Error("report should not be called");
      },
      sourceCode,
    } as unknown as Rule.RuleContext;

    // Act
    const actualProgram = getTypeScriptProgram(context);

    // Assert
    expect(actualProgram).toBeUndefined();
  });
});
