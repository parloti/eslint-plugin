import { existsSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import { afterEach, describe, expect, it } from "vitest";

import { createTemporaryFixtureManager } from "./index";

describe(createTemporaryFixtureManager, () => {
  const managers: ReturnType<typeof createTemporaryFixtureManager>[] = [];

  afterEach(() => {
    for (const manager of managers.splice(0)) {
      manager.cleanupTemporaryDirectories();
    }
  });

  it("creates fixture sets in the default root and normalizes folder globs", () => {
    // Arrange
    const manager = createTemporaryFixtureManager();
    managers.push(manager);
    const expectedRoot = path.join(cwd(), "tmp");

    // Act
    const actual = (() => {
      const fixtureSet = manager.createFixtureSet({
        "feature.ts": "export const feature = 1;",
        "nested/value.ts": "export const nested = 2;",
      });
      const result = {
        directoryRoot: path.dirname(fixtureSet.directory),
        featurePath: fixtureSet.filePaths["feature.ts"],
        folderGlobs: fixtureSet.folderGlobs,
        nestedPath: fixtureSet.getFilePath("nested/value.ts"),
        normalizedFolderGlob: fixtureSet.folderGlob,
        normalizedSeparators: fixtureSet.folderGlob.includes("\\"),
      };

      manager.cleanupTemporaryDirectories();

      return {
        ...result,
        fixtureDirectoryExists: existsSync(fixtureSet.directory),
        fixtureDirectoryPath: fixtureSet.directory,
      };
    })();

    // Assert
    expect(actual).toStrictEqual({
      directoryRoot: expectedRoot,
      featurePath: path.join(actual.fixtureDirectoryPath, "feature.ts"),
      fixtureDirectoryExists: false,
      fixtureDirectoryPath: actual.fixtureDirectoryPath,
      folderGlobs: [actual.normalizedFolderGlob],
      nestedPath: path.join(actual.fixtureDirectoryPath, "nested/value.ts"),
      normalizedFolderGlob: actual.normalizedFolderGlob,
      normalizedSeparators: false,
    });
    expect(actual.normalizedFolderGlob).toMatch(/\/\*\*$/);
  });

  it("creates fixture sets under the requested root and throws for missing files", () => {
    // Arrange
    const manager = createTemporaryFixtureManager();
    managers.push(manager);
    const expectedRoot = path.join(cwd(), "src");

    // Act
    const actual = (() => {
      const fixtureSet = manager.createFixtureSet(
        { "src/feature.ts": "export const feature = 1;" },
        "src",
      );

      return {
        directoryRoot: path.dirname(fixtureSet.directory),
        missingFilePathGetter: () => fixtureSet.getFilePath("missing.ts"),
      };
    })();

    // Assert
    expect(actual.directoryRoot).toBe(expectedRoot);
    expect(actual.missingFilePathGetter).toThrow(
      "Missing fixture file path for missing.ts.",
    );
  });

  it("allows cleanup before any fixture is created", () => {
    // Arrange
    const manager = createTemporaryFixtureManager();
    managers.push(manager);

    // Act
    const cleanupResult = manager.cleanupTemporaryDirectories;

    // Assert
    expect(cleanupResult).not.toThrow();
  });
});
