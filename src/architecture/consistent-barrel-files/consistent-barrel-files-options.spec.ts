import { describe, expect, it } from "vitest";

import {
  getOptions,
  isLintableFilename,
  shouldLintFile,
} from "./consistent-barrel-files-options";

describe("consistent-barrel-files options", () => {
  it("builds default options", () => {
    // Arrange
    const rawOptions: [] = [];

    // Act
    const state = getOptions(rawOptions);

    // Assert
    expect(state.allowedNames).toStrictEqual(["index"]);
  });

  it("checks lintable filenames", () => {
    // Arrange
    const filename = `${process.cwd()}/src/index.ts`;

    // Act
    const result = {
      emptyFilename: isLintableFilename(""),
      lintableFilename: isLintableFilename(filename),
    };

    // Assert
    expect(result.emptyFilename).toBe(false);
    expect(result.lintableFilename).toBe(true);
  });

  it("verifies repo file matching for linting", () => {
    // Arrange
    const rawOptions: [] = [];
    const filename = `${process.cwd()}/src/index.ts`;

    // Act
    const state = getOptions(rawOptions);

    // Assert
    expect(shouldLintFile(filename, state.allowedNames)).toBe(true);
  });
});
