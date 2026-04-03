import { cwd } from "node:process";
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
    const filename = `${cwd()}/src/index.ts`;

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
    const { allowedNames } = getOptions(rawOptions);
    const filename = `${cwd()}/src/index.ts`;
    const nestedFilename = `${cwd()}/packages/plugin/src/index.ts`;
    const nonSourceFilename = `${cwd()}/tmp/index.ts`;

    // Act
    const result = {
      nestedSource: shouldLintFile(nestedFilename, allowedNames),
      nonSource: shouldLintFile(nonSourceFilename, allowedNames),
      source: shouldLintFile(filename, allowedNames),
    };

    // Assert
    expect(result).toStrictEqual({
      nestedSource: true,
      nonSource: false,
      source: true,
    });
  });
});
