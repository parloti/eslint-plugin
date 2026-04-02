import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

import {
  getOptions,
  isLintableFilename,
  isPathMatch,
  isTypeScriptFile,
  TYPESCRIPT_EXTENSION,
} from "./require-test-companion-options";

describe("require-test-companion options", () => {
  it("normalizes defaults", () => {
    // Arrange
    const options: [] = [];

    // Act
    const state = getOptions(options);

    // Assert
    expect(state.enforceIn.length).toBeGreaterThan(0);
    expect(state.testSuffixes.length).toBeGreaterThan(0);
  });

  it("checks file types", () => {
    // Arrange
    const declarationFilename = "file.d.ts";
    const sourceFilename = `file${TYPESCRIPT_EXTENSION}`;

    // Act
    const result = {
      declarationFile: isTypeScriptFile(declarationFilename),
      sourceFile: isTypeScriptFile(sourceFilename),
    };

    // Assert
    expect(result.sourceFile).toBe(true);
    expect(result.declarationFile).toBe(false);
  });

  it("checks path patterns", () => {
    // Arrange
    const filename = `${cwd()}/src/index.ts`;

    // Act
    const result = {
      lintableFilename: isLintableFilename(filename),
      pathMatch: isPathMatch(filename, ["src/**"]),
    };

    // Assert
    expect(result.lintableFilename).toBe(true);
    expect(result.pathMatch).toBe(true);
  });
});
