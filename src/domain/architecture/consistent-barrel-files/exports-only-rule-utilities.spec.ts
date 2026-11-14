import type { AST } from "eslint";

import { tmpdir } from "node:os";
import path from "node:path";
import { cwd } from "node:process";
import * as ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import { runTypedBarrel } from "./__tests__/exports-only-rule-test-utilities";
import {
  getCompilerOptions,
  hasLocalExportTarget,
} from "./exports-only-rule-utilities";

const filename = path.join(cwd(), "tmp", "barrel", "index.ts");

const createExport = (source: unknown): AST.Program["body"][number] =>
  ({
    attributes: [],
    exportKind: "value",
    source,
    specifiers: [],
    type: "ExportNamedDeclaration",
  }) as unknown as AST.Program["body"][number];

describe("exports-only rule utilities", () => {
  it("returns no compiler options when no TypeScript config is available", () => {
    // Arrange
    const fileWithoutConfig = path.join(tmpdir(), "barrel", "index.ts");

    // Act
    const actualOptions = getCompilerOptions(fileWithoutConfig, void 0);

    // Assert
    expect(actualOptions).toBeUndefined();
  });

  it("allows statements that are not export declarations", () => {
    // Arrange
    const importStatement = {
      source: { type: "Literal", value: "./feature" },
      type: "ImportDeclaration",
    } as never;

    // Act
    const actualResult = hasLocalExportTarget(
      importStatement,
      filename,
      void 0,
      void 0,
    );

    // Assert
    expect(actualResult).toBe(true);
  });

  it.each([
    ["a non-object source", 42],
    ["a non-string module specifier", { type: "Literal", value: 42 }],
    ["an empty module specifier", { type: "Literal", value: "" }],
  ])("rejects %s", (_label, source) => {
    // Arrange
    const statement = createExport(source);

    // Act
    const actualResult = hasLocalExportTarget(
      statement,
      filename,
      void 0,
      void 0,
    );

    // Assert
    expect(actualResult).toBe(false);
  });

  it.each([
    ["a sibling target", "../outside", false],
    ["a descendant target", "./feature", true],
  ])(
    "resolves %s from the barrel folder without compiler options",
    (_label, moduleSpecifier, expected) => {
      // Arrange
      const statement = createExport({
        raw: `'${moduleSpecifier}'`,
        type: "Literal",
        value: moduleSpecifier,
      });

      // Act
      const actualResult = hasLocalExportTarget(
        statement,
        filename,
        void 0,
        void 0,
      );

      // Assert
      expect(actualResult).toBe(expected);
    },
  );

  it("uses the TypeScript node mapping to choose an export resolution mode", () => {
    // Arrange
    const source = { raw: "'./feature'", type: "Literal", value: "./feature" };
    const sourceFile = ts.createSourceFile(
      filename,
      "export * from './feature';",
      ts.ScriptTarget.Latest,
    );
    const exportDeclaration = sourceFile.statements[0] as ts.ExportDeclaration;
    const typeScriptSource = exportDeclaration.moduleSpecifier;
    const getModeForUsageLocation = vi.fn((): undefined => undefined);
    const parserServices = {
      esTreeNodeToTSNodeMap: new Map([[source, typeScriptSource]]),
      program: { getModeForUsageLocation },
    } as never;

    // Act
    const actualResult = hasLocalExportTarget(
      createExport(source),
      filename,
      parserServices,
      {},
    );

    // Assert
    expect(actualResult).toBe(true);
    expect(getModeForUsageLocation).toHaveBeenCalledOnce();
  });

  it("resolves without a mapped TypeScript source node", () => {
    // Arrange
    const source = { raw: "'./feature'", type: "Literal", value: "./feature" };
    const getModeForUsageLocation = vi.fn((): undefined => undefined);
    const parserServices = {
      esTreeNodeToTSNodeMap: new Map(),
      program: { getModeForUsageLocation },
    } as never;

    // Act
    const actualResult = hasLocalExportTarget(
      createExport(source),
      filename,
      parserServices,
      {},
    );

    // Assert
    expect(actualResult).toBe(true);
    expect(getModeForUsageLocation).not.toHaveBeenCalled();
  });

  it("resolves when a mapped TypeScript source node is not a string literal", () => {
    // Arrange
    const source = { raw: "'./feature'", type: "Literal", value: "./feature" };
    const sourceFile = ts.createSourceFile(
      filename,
      "const value = 1;",
      ts.ScriptTarget.Latest,
    );
    const typeScriptSource = sourceFile.statements[0];
    const getModeForUsageLocation = vi.fn((): undefined => undefined);
    const parserServices = {
      esTreeNodeToTSNodeMap: new Map([[source, typeScriptSource]]),
      program: { getModeForUsageLocation },
    } as never;

    // Act
    const actualResult = hasLocalExportTarget(
      createExport(source),
      filename,
      parserServices,
      {},
    );

    // Assert
    expect(actualResult).toBe(true);
    expect(getModeForUsageLocation).not.toHaveBeenCalled();
  });
});

describe("exports-only rule test helpers", () => {
  it("handles parser diagnostics without message identifiers", () => {
    // Arrange
    const invalidSource = "export const = ;";

    // Act
    const actualReports = runTypedBarrel(invalidSource);

    // Assert
    expect(actualReports).toStrictEqual([""]);
  });
});
