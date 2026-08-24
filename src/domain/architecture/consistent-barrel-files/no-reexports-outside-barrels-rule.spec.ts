import { rmSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import { afterEach, describe, expect, it } from "vitest";

import type { NoReexportsOutsideBarrelsOptions } from "./types";

import {
  createTemporaryRunner,
  runRule,
} from "./__tests__/no-reexports-outside-barrels-test-utilities";
import {
  createBody,
  createExportAll,
  createExportDefaultIdentifier,
  createExportNamedFrom,
  createExportSpecifier,
  createExportWithDeclaration,
  createExportWithoutSource,
  createImportDeclaration,
  createImportDefaultSpecifier,
  createImportSpecifier,
} from "./__tests__/test-helpers";

describe("no reexports outside barrels rule (enforced)", () => {
  const temporaryDirectories: string[] = [];
  const defaultOptions: NoReexportsOutsideBarrelsOptions = {};
  const { runDefaultFeature, runTemporaryFeature, runTemporaryIndex } =
    createTemporaryRunner(temporaryDirectories);

  afterEach(() => {
    for (const directory of temporaryDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  const importedFeatureSpecifiers = [createImportSpecifier("feature")];
  const importedFeatureDeclaration = createImportDeclaration(
    importedFeatureSpecifiers,
  );
  const exportedFeatureSpecifiers = [createExportSpecifier("feature")];
  const exportedFeatureDeclaration = createExportWithoutSource(
    exportedFeatureSpecifiers,
  );
  const importedFeatureBody = createBody(
    importedFeatureDeclaration,
    exportedFeatureDeclaration,
  );
  const importedDefaultSpecifiers = [createImportDefaultSpecifier("feature")];
  const importedDefaultDeclaration = createImportDeclaration(
    importedDefaultSpecifiers,
  );
  const defaultExportedImportBody = createBody(
    importedDefaultDeclaration,
    createExportDefaultIdentifier("feature"),
  );
  const localExportSpecifiers = [createExportSpecifier("local")];
  const localExportDeclaration = createExportWithoutSource(
    localExportSpecifiers,
  );
  const localExportsBody = createBody(localExportDeclaration);

  it("uses default options for detection", () => {
    // Arrange
    const body = createBody(createExportAll());

    // Act
    const actualReports = runDefaultFeature(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("reexportNotAllowed");
  });

  it("accepts string names for barrel detection", () => {
    // Arrange
    const options: NoReexportsOutsideBarrelsOptions = {
      allowedBarrelNames: ["index"],
    };

    // Act
    const actualReports = runTemporaryIndex(
      createBody(createExportAll()),
      options,
    );

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it.each([
    ["export-all re-exports", createBody(createExportAll())],
    ["export named from re-exports", createBody(createExportNamedFrom())],
  ])("reports on %s", (_label, body) => {
    // Act
    const actualReports = runTemporaryFeature(body, defaultOptions);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("reexportNotAllowed");
  });

  it.each([
    ["exporting imported specifiers", importedFeatureBody],
    ["default export of imported identifiers", defaultExportedImportBody],
  ])("reports on %s", (_label, body) => {
    // Act
    const actualReports = runTemporaryFeature(body, defaultOptions);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("reexportedImport");
  });

  it.each([
    [
      "local exports with declarations",
      createBody(createExportWithDeclaration()),
    ],
    ["exports without imports", localExportsBody],
  ])("allows %s", (_label, body) => {
    // Act
    const actualReports = runTemporaryFeature(body, defaultOptions);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });
});

describe("no reexports outside barrels rule (skips)", () => {
  const temporaryDirectories: string[] = [];
  const defaultOptions: NoReexportsOutsideBarrelsOptions = {};
  const { runTemporaryIndex } = createTemporaryRunner(temporaryDirectories);

  afterEach(() => {
    for (const directory of temporaryDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("skips barrel files", () => {
    // Arrange
    const body = createBody(createExportAll());
    const options = {
      allowedBarrelNames: ["index"],
    };

    // Act
    const actualReports = runTemporaryIndex(body, options);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("skips when filename is not absolute", () => {
    // Arrange
    const filePath = "relative/feature.ts";
    const body = createBody(createExportAll());

    // Act
    const actualReports = runRule(filePath, body, defaultOptions);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("skips when file is outside the repo", () => {
    // Arrange
    const filePath = path.resolve(cwd(), "..", "outside", "feature.ts");
    const body = createBody(createExportAll());

    // Act
    const actualReports = runRule(filePath, body, defaultOptions);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });
});
