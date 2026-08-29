import type { AST } from "eslint";

import { describe, expect, it } from "vitest";

import { parseProgram } from "./__tests__/no-unused-exports-utilities-test-helpers";
import { collectExportedElements } from "./no-unused-exports-declaration-utilities";

describe("no-unused-exports declaration utilities", () => {
  it("collects value and type declarations, aliases, and default exports", () => {
    // Arrange
    const program = parseProgram(
      [
        "export const value = 1;",
        "export type Alias = string;",
        "export interface Shape { size: number; }",
        "const local = value;",
        "export { value as renamed, local as localAlias };",
        "export default value;",
      ].join("\n"),
    );

    // Act
    const actual = collectExportedElements(program.body).map(
      ({ exportedName, exportKind }) => ({ exportedName, exportKind }),
    );

    // Assert
    expect(actual).toStrictEqual([
      { exportedName: "value", exportKind: "value" },
      { exportedName: "Alias", exportKind: "type" },
      { exportedName: "Shape", exportKind: "type" },
      { exportedName: "renamed", exportKind: "value" },
      { exportedName: "localAlias", exportKind: "value" },
      { exportedName: "default", exportKind: "value" },
    ]);
  });

  it("collects destructured declarations and named declaration forms", () => {
    // Arrange
    const program = parseProgram(
      [
        "const source = { nested: { value: 1 }, list: [2] };",
        "export const [first, ...rest] = source.list;",
        "export const { nested: { value }, ...other } = source;",
        "export function build() {}",
        "export class Feature {}",
        "export enum Kind { Value }",
      ].join("\n"),
    );

    // Act
    const actual = collectExportedElements(program.body).map(
      (element) => element.exportedName,
    );

    // Assert
    expect(actual).toStrictEqual([
      "first",
      "rest",
      "value",
      "other",
      "build",
      "Feature",
      "Kind",
    ]);
  });

  it("marks type-only specifiers and retains their declaration nodes", () => {
    // Arrange
    const program = parseProgram(
      [
        "interface Shape { size: number; }",
        "const value = 1;",
        "export type { Shape };",
        "export type { value as ValueShape };",
      ].join("\n"),
    );

    // Act
    const actual = collectExportedElements(program.body).map(
      ({ exportedName, exportKind, node }) => ({
        exportedName,
        exportKind,
        nodeType: node.type,
      }),
    );

    // Assert
    expect(actual).toStrictEqual([
      {
        exportedName: "Shape",
        exportKind: "type",
        nodeType: "TSInterfaceDeclaration",
      },
      {
        exportedName: "ValueShape",
        exportKind: "type",
        nodeType: "VariableDeclaration",
      },
    ]);
  });

  it("ignores re-exports and imported bindings", () => {
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
    const actual = collectExportedElements(program.body).map(
      (element) => element.exportedName,
    );

    // Assert
    expect(actual).toStrictEqual(["renamedLocal"]);
  });

  it("ignores malformed declarations", () => {
    // Arrange
    const malformed = [
      {
        declaration: { id: { name: "broken" } },
        source: void 0,
        specifiers: [],
        type: "ExportNamedDeclaration",
      },
      {
        declarations: [void 0],
        type: "VariableDeclaration",
      },
      {
        type: "VariableDeclaration",
      },
    ] as unknown as AST.Program["body"];

    // Act

    const actual = collectExportedElements(malformed).map(
      ({ exportedName, exportKind }) => ({ exportedName, exportKind }),
    );

    // Assert
    expect(actual).toStrictEqual([
      { exportedName: "broken", exportKind: "value" },
    ]);
  });
});
