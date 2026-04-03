import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import { afterEach, describe, expect, it } from "vitest";

import {
  getDirectoryBarrelState,
  isBarrelFile,
  isLintableModuleFile,
  normalizeAllowedBarrelNames,
} from "./barrel-file-utilities";
import { createRepoDirectory } from "./test-helpers";
import { writeFeature } from "./test-helpers.file-writers";

describe("barrel file utilities", () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("normalizes default barrel names", () => {
    // Arrange
    const expectedNames = ["index"];

    // Act
    const names = normalizeAllowedBarrelNames(void 0);

    // Assert
    expect(names).toStrictEqual(expectedNames);
  });

  it("does not treat declaration files as lintable module files", () => {
    // Arrange
    const declarationFile = path.join(cwd(), "src", "index.d.ts");

    // Act
    const result = {
      barrel: isBarrelFile(declarationFile, new Set(["index"])),
      lintable: isLintableModuleFile(declarationFile),
    };

    // Assert
    expect(result.barrel).toBe(false);
    expect(result.lintable).toBe(false);
  });

  it("ignores declaration files when computing directory barrel state", () => {
    // Arrange
    const directory = createRepoDirectory("tmp");
    temporaryDirectories.push(directory);
    const featurePath = path.join(directory, "feature.ts");
    const declarationBarrelPath = path.join(directory, "index.d.ts");
    writeFeature(featurePath);
    writeFileSync(declarationBarrelPath, "export interface Feature {}", "utf8");

    // Act
    const state = getDirectoryBarrelState(directory, new Set(["index"]));

    // Assert
    expect(state).toStrictEqual({
      hasAllowedBarrelFile: false,
      hasNonBarrelModuleFile: true,
      primaryNonBarrelModuleFile: "feature.ts",
    });
  });

  it("treats plain modules as non-barrels and tolerates missing directories", () => {
    // Arrange
    const featureFile = path.join(cwd(), "src", "feature.ts");
    const missingDirectory = path.join(cwd(), "missing-directory");

    // Act
    const actual = {
      missingDirectoryState: getDirectoryBarrelState(
        missingDirectory,
        new Set(["index"]),
      ),
      plainModuleIsBarrel: isBarrelFile(featureFile, new Set(["index"])),
    };

    // Assert
    expect(actual.plainModuleIsBarrel).toBe(false);
    expect(actual.missingDirectoryState).toStrictEqual({
      hasAllowedBarrelFile: false,
      hasNonBarrelModuleFile: false,
      primaryNonBarrelModuleFile: void 0,
    });
  });

  it("recognizes ordinary TypeScript modules inside the repo", () => {
    // Arrange
    const featureFile = path.join(cwd(), "src", "feature.ts");

    // Act
    const actual = isLintableModuleFile(featureFile);

    // Assert
    expect(actual).toBe(true);
  });

  it("treats unsupported file extensions as non-lintable module files", () => {
    // Arrange
    const markdownFile = path.join(cwd(), "README.md");

    // Act
    const actual = isLintableModuleFile(markdownFile);

    // Assert
    expect(actual).toBe(false);
  });
});
