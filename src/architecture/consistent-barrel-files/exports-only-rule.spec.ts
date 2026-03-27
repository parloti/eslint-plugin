import fs from "node:fs";
import path from "node:path";
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
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it("allows empty barrel files", () => {
    // Arrange
    const body = createBody();

    // Act
    const reports = runTemporaryIndex(body);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("uses default options for barrel detection", () => {
    // Arrange
    const body = createBody(createImportDeclaration());

    // Act
    const reports = runDefaultIndex(body);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("invalidBarrelContent");
  });

  it("allows exported type-only declarations", () => {
    // Arrange
    const body = createBody(
      createExportInterfaceDeclaration(),
      createExportTypeAliasDeclaration(),
    );

    // Act
    const reports = runTemporaryIndex(body);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("allows re-export statements", () => {
    // Arrange
    const body = createBody(createExportAll(), createExportNamedFrom());

    // Act
    const reports = runTemporaryIndex(body);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("supports custom barrel names", () => {
    // Arrange
    const body = createBody(createExportNamedFrom());

    // Act
    const reports = runTemporaryBarrel("mod.ts", body, [
      { allowedBarrelNames: ["mod"] },
    ]);

    // Assert
    expect(reports).toStrictEqual([]);
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
    const reports = runTemporaryIndex(body);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("invalidBarrelContent");
  });
});

describe("barrel files exports-only rule (skips)", () => {
  const temporaryDirectories: string[] = [];
  const { runTemporaryFeature } = createTemporaryRunner(temporaryDirectories);

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it("skips non-barrel files", () => {
    // Arrange
    const body = createBody(createImportDeclaration());

    // Act
    const reports = runTemporaryFeature(body);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips when filename is not absolute", () => {
    // Arrange
    const filePath = "relative/index.ts";
    const body = createBody(createImportDeclaration());

    // Act
    const reports = runRule(filePath, body);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips when file is outside the repo", () => {
    // Arrange
    const filePath = path.resolve(process.cwd(), "..", "outside", "index.ts");
    const body = createBody(createImportDeclaration());

    // Act
    const reports = runRule(filePath, body);

    // Assert
    expect(reports).toStrictEqual([]);
  });
});
