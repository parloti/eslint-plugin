import { rmSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import { afterEach, describe, expect, it } from "vitest";

import type { NoReexportsOutsideBarrelsOptions } from "./types";

import {
  createTemporaryRunner,
  runRule,
} from "./no-reexports-outside-barrels-test-utilities";
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
} from "./test-helpers";

describe("no reexports outside barrels rule (enforced)", () => {
  const temporaryDirectories: string[] = [];
  const defaultOptions: NoReexportsOutsideBarrelsOptions = {};
  const { runDefaultFeature, runTemporaryFeature, runTemporaryIndex } =
    createTemporaryRunner(temporaryDirectories);

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("uses default options for detection", () => {
    // Arrange
    const body = createBody(createExportAll());

    // Act
    const reports = runDefaultFeature(body);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("reexportNotAllowed");
  });

  it("accepts string names for barrel detection", () => {
    // Arrange
    const options: NoReexportsOutsideBarrelsOptions = {
      allowedBarrelNames: ["index"],
    };

    // Act
    const reports = runTemporaryIndex(createBody(createExportAll()), options);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it.each([
    ["export-all re-exports", createBody(createExportAll())],
    ["export named from re-exports", createBody(createExportNamedFrom())],
  ])("reports on %s", (_label, body) => {
    // Act
    const reports = runTemporaryFeature(body, defaultOptions);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("reexportNotAllowed");
  });

  it.each([
    [
      "exporting imported specifiers",
      createBody(
        createImportDeclaration([createImportSpecifier("feature")]),
        createExportWithoutSource([createExportSpecifier("feature")]),
      ),
    ],
    [
      "default export of imported identifiers",
      createBody(
        createImportDeclaration([createImportDefaultSpecifier("feature")]),
        createExportDefaultIdentifier("feature"),
      ),
    ],
  ])("reports on %s", (_label, body) => {
    // Act
    const reports = runTemporaryFeature(body, defaultOptions);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("reexportedImport");
  });

  it.each([
    [
      "local exports with declarations",
      createBody(createExportWithDeclaration()),
    ],
    [
      "exports without imports",
      createBody(createExportWithoutSource([createExportSpecifier("local")])),
    ],
  ])("allows %s", (_label, body) => {
    // Act
    const reports = runTemporaryFeature(body, defaultOptions);

    // Assert
    expect(reports).toStrictEqual([]);
  });
});

describe("no reexports outside barrels rule (skips)", () => {
  const temporaryDirectories: string[] = [];
  const defaultOptions: NoReexportsOutsideBarrelsOptions = {};
  const { runTemporaryIndex } = createTemporaryRunner(temporaryDirectories);

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
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
    const reports = runTemporaryIndex(body, options);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips when filename is not absolute", () => {
    // Arrange
    const filePath = "relative/feature.ts";
    const body = createBody(createExportAll());

    // Act
    const reports = runRule(filePath, body, defaultOptions);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips when file is outside the repo", () => {
    // Arrange
    const filePath = path.resolve(cwd(), "..", "outside", "feature.ts");
    const body = createBody(createExportAll());

    // Act
    const reports = runRule(filePath, body, defaultOptions);

    // Assert
    expect(reports).toStrictEqual([]);
  });
});
