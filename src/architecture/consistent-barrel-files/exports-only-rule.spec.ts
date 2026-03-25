import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { BarrelFilesExportsOnlyOptions } from "./types";

import {
  createTemporaryRunner,
  runRule,
} from "./exports-only-rule-test-utilities";
import {
  createBody,
  createExportAll,
  createExportNamedFrom,
  createExportWithDeclaration,
  createExportWithoutSource,
  createImportDeclaration,
} from "./test-helpers";

describe("barrel files exports-only rule (enforced)", () => {
  const temporaryDirectories: string[] = [];
  const allowAllFolders: BarrelFilesExportsOnlyOptions = { folders: ["**"] };
  const { runDefaultIndex, runTemporaryIndex } =
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
    const reports = runTemporaryIndex(body, allowAllFolders);

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

  it("accepts string names for barrel detection", () => {
    // Arrange
    const options: BarrelFilesExportsOnlyOptions = {
      folders: ["tmp/**"],
      names: "index.ts",
    };
    const body = createBody(createImportDeclaration());

    // Act
    const reports = runTemporaryIndex(body, options);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("invalidBarrelContent");
  });

  it("allows re-export statements", () => {
    // Arrange
    const body = createBody(createExportAll(), createExportNamedFrom());

    // Act
    const reports = runTemporaryIndex(body, allowAllFolders);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it.each([
    ["import declarations", createBody(createImportDeclaration())],
    ["exported declarations", createBody(createExportWithDeclaration())],
    ["exports without sources", createBody(createExportWithoutSource())],
  ])("reports on %s", (_label, body) => {
    // Act
    const reports = runTemporaryIndex(body, allowAllFolders);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("invalidBarrelContent");
  });
});

describe("barrel files exports-only rule (skips)", () => {
  const temporaryDirectories: string[] = [];
  const allowAllFolders: BarrelFilesExportsOnlyOptions = { folders: ["**"] };
  const { runTemporaryFeature, runTemporaryIndex } =
    createTemporaryRunner(temporaryDirectories);

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it("skips non-barrel files", () => {
    // Arrange
    const body = createBody(createImportDeclaration());

    // Act
    const reports = runTemporaryFeature(body, allowAllFolders);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it.each([["names are empty", { folders: ["tmp/**"], names: "   " }]])(
    "skips when %s",
    (_label, options) => {
      // Arrange
      const body = createBody(createImportDeclaration());

      // Act
      const reports = runTemporaryIndex(body, options);

      // Assert
      expect(reports).toStrictEqual([]);
    },
  );

  it("skips when folders are blank", () => {
    // Arrange
    const body = createBody(createImportDeclaration());
    const options = {
      folders: "   ",
      names: ["index.ts"],
    };

    // Act
    const reports = runTemporaryIndex(body, options);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips when filename is not absolute", () => {
    // Arrange
    const filePath = "relative/index.ts";
    const body = createBody(createImportDeclaration());

    // Act
    const reports = runRule(filePath, body, allowAllFolders);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips when file is outside the repo", () => {
    // Arrange
    const filePath = path.resolve(process.cwd(), "..", "outside", "index.ts");
    const body = createBody(createImportDeclaration());

    // Act
    const reports = runRule(filePath, body, allowAllFolders);

    // Assert
    expect(reports).toStrictEqual([]);
  });
});
