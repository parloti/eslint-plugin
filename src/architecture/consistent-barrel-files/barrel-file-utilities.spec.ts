import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  getDirectoryBarrelState,
  isBarrelFile,
  isLintableModuleFile,
  normalizeAllowedBarrelNames,
} from "./barrel-file-utilities";
import { createRepoDirectory, writeFeature } from "./test-helpers";

describe("barrel file utilities", () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it("normalizes default barrel names", () => {
    // Arrange

    // Act
    const names = normalizeAllowedBarrelNames(void 0);

    // Assert
    expect(names).toStrictEqual(["index"]);
  });

  it("does not treat declaration files as lintable module files", () => {
    // Arrange
    const declarationFile = path.join(process.cwd(), "src", "index.d.ts");

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
    fs.writeFileSync(
      declarationBarrelPath,
      "export interface Feature {}",
      "utf8",
    );

    // Act
    const state = getDirectoryBarrelState(directory, new Set(["index"]));

    // Assert
    expect(state).toStrictEqual({
      hasAllowedBarrelFile: false,
      hasNonBarrelModuleFile: true,
      primaryNonBarrelModuleFile: "feature.ts",
    });
  });
});
