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

    // Act
    const fixtureSet = manager.createFixtureSet({
      "feature.ts": "export const feature = 1;",
      "nested/value.ts": "export const nested = 2;",
    });

    // Assert
    expect(path.dirname(fixtureSet.directory)).toBe(path.join(cwd(), "tmp"));
    expect(fixtureSet.filePaths["feature.ts"]).toBe(
      path.join(fixtureSet.directory, "feature.ts"),
    );
    expect(fixtureSet.getFilePath("nested/value.ts")).toBe(
      path.join(fixtureSet.directory, "nested/value.ts"),
    );
    expect(fixtureSet.folderGlobs).toStrictEqual([fixtureSet.folderGlob]);
    expect(fixtureSet.folderGlob).toMatch(/\/\*\*$/);
    expect(fixtureSet.folderGlob).not.toContain("\\");

    manager.cleanupTemporaryDirectories();

    expect(existsSync(fixtureSet.directory)).toBe(false);
  });

  it("creates fixture sets under the requested root and throws for missing files", () => {
    // Arrange
    const manager = createTemporaryFixtureManager();
    managers.push(manager);

    // Act
    const fixtureSet = manager.createFixtureSet(
      { "src/feature.ts": "export const feature = 1;" },
      "src",
    );

    // Assert
    expect(path.dirname(fixtureSet.directory)).toBe(path.join(cwd(), "src"));
    expect(() => fixtureSet.getFilePath("missing.ts")).toThrow(
      "Missing fixture file path for missing.ts.",
    );
  });

  it("allows cleanup before any fixture is created", () => {
    // Arrange
    const manager = createTemporaryFixtureManager();
    managers.push(manager);

    // Act
    manager.cleanupTemporaryDirectories();

    // Assert
    expect(true).toBe(true);
  });
});
