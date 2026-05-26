import { rmSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import { afterEach, describe, expect, it } from "vitest";

import {
  createTemporaryRunner,
  runRule,
} from "./exports-only-rule-test-utilities";
import {
  createBody,
  createExportAll,
  createExportInterfaceDeclaration,
  createExportNamedFrom,
  createExportTypeAliasDeclaration,
  createExportWithDeclaration,
  createExportWithoutSource,
  createImportDeclaration,
} from "./test-helpers";

describe("barrel files exports-only rule (enforced)", () => {
  const temporaryDirectories: string[] = [];
  const { runDefaultIndex, runTemporaryBarrel, runTemporaryIndex } =
    createTemporaryRunner(temporaryDirectories);

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("allows empty barrel files", () => {
    // Arrange
    const body = createBody();

    // Act
    const actualReports = runTemporaryIndex(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("uses default options for barrel detection", () => {
    // Arrange
    const body = createBody(createImportDeclaration());

    // Act
    const actualReports = runDefaultIndex(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("invalidBarrelContent");
  });

  it("allows exported type-only declarations", () => {
    // Arrange
    const body = createBody(
      createExportInterfaceDeclaration(),
      createExportTypeAliasDeclaration(),
    );

    // Act
    const actualReports = runTemporaryIndex(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("allows local type-only export specifiers", () => {
    // Arrange
    const body = createBody({
      exportKind: "type",
      source: void 0,
      specifiers: [
        {
          exported: { name: "Feature", type: "Identifier" },
          exportKind: "type",
          local: { name: "Feature", type: "Identifier" },
          type: "ExportSpecifier",
        },
      ],
      type: "ExportNamedDeclaration",
    } as never);

    // Act
    const actualReports = runTemporaryIndex(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("allows source-based type-only export specifiers", () => {
    // Arrange
    const body = createBody({
      exportKind: "value",
      source: { raw: "'./feature'", type: "Literal", value: "./feature" },
      specifiers: [
        {
          exported: { name: "Feature", type: "Identifier" },
          exportKind: "type",
          local: { name: "Feature", type: "Identifier" },
          type: "ExportSpecifier",
        },
      ],
      type: "ExportNamedDeclaration",
    } as never);

    // Act
    const actualReports = runTemporaryIndex(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("allows re-export statements", () => {
    // Arrange
    const body = createBody(createExportAll(), createExportNamedFrom());

    // Act
    const actualReports = runTemporaryIndex(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("allows type-only export-all statements", () => {
    // Arrange
    const body = createBody({
      attributes: [],
      exportKind: "type",
      source: { raw: "'./feature'", type: "Literal", value: "./feature" },
      type: "ExportAllDeclaration",
    } as never);

    // Act
    const actualReports = runTemporaryIndex(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("supports custom barrel names", () => {
    // Arrange
    const body = createBody(createExportNamedFrom());

    // Act
    const actualReports = runTemporaryBarrel("mod.ts", body, [
      { allowedBarrelNames: ["mod"] },
    ]);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it.each([
    ["import declarations", createBody(createImportDeclaration())],
    [
      "exported non-type function declarations",
      createBody({
        declaration: { type: "FunctionDeclaration" },
        specifiers: [],
        type: "ExportNamedDeclaration",
      } as never),
    ],
    ["exported declarations", createBody(createExportWithDeclaration())],
    ["exports without sources", createBody(createExportWithoutSource())],
  ])("reports on %s", (_label, body) => {
    // Act
    const actualReports = runTemporaryIndex(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("invalidBarrelContent");
  });

  it("reports mixed local export specifiers with runtime bindings", () => {
    // Arrange
    const body = createBody({
      source: void 0,
      specifiers: [
        {
          exported: { name: "Feature", type: "Identifier" },
          exportKind: "type",
          local: { name: "Feature", type: "Identifier" },
          type: "ExportSpecifier",
        },
        {
          exported: { name: "runtimeValue", type: "Identifier" },
          exportKind: "value",
          local: { name: "runtimeValue", type: "Identifier" },
          type: "ExportSpecifier",
        },
      ],
      type: "ExportNamedDeclaration",
    } as never);

    // Act
    const actualReports = runTemporaryIndex(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("invalidBarrelContent");
  });

  it("reports exports without source when specifiers include non-object entries", () => {
    // Arrange
    const body = createBody({
      specifiers: [0 as never],
      type: "ExportNamedDeclaration",
    } as never);

    // Act
    const actualReports = runTemporaryIndex(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("invalidBarrelContent");
  });
});

describe("barrel files exports-only rule (skips)", () => {
  const temporaryDirectories: string[] = [];
  const { runTemporaryFeature } = createTemporaryRunner(temporaryDirectories);

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("skips non-barrel files", () => {
    // Arrange
    const body = createBody(createImportDeclaration());

    // Act
    const actualReports = runTemporaryFeature(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("skips when filename is not absolute", () => {
    // Arrange
    const filePath = "relative/index.ts";
    const body = createBody(createImportDeclaration());

    // Act
    const actualReports = runRule(filePath, body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("skips when file is outside the repo", () => {
    // Arrange
    const filePath = path.resolve(cwd(), "..", "outside", "index.ts");
    const body = createBody(createImportDeclaration());

    // Act
    const actualReports = runRule(filePath, body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("reports export statements without a source or declaration", () => {
    // Arrange
    const filePath = path.join(cwd(), "src", "index.ts");
    const body = createBody({
      declaration: "not-a-node",
      source: void 0,
      specifiers: [],
      type: "ExportNamedDeclaration",
    } as never);

    // Act
    const actualReports = runRule(filePath, body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("invalidBarrelContent");
  });
});
