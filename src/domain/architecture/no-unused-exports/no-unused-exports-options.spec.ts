import path from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_ALLOW_IN_FILES,
  DEFAULT_TEST_FILE_PATTERNS,
  getOptions,
  isAllowlistedFile,
  isLintableFilename,
  isTestFile,
  matchesAnyPattern,
  toRepoRelativePosixPath,
} from "./no-unused-exports-options";

describe("no-unused-exports options", () => {
  it("builds default options", () => {
    // Arrange
    const rawOptions: [] = [];

    // Act
    const state = getOptions(rawOptions);

    // Assert
    expect(state).toStrictEqual({
      allowInFiles: [...DEFAULT_ALLOW_IN_FILES],
      testFilePatterns: [...DEFAULT_TEST_FILE_PATTERNS],
    });
  });

  it("normalizes custom options", () => {
    // Arrange
    const rawOptions = [
      {
        allowInFiles: ["  src/index.ts  ", "", 1],
        testFilePatterns: ["tests/**/*.ts", "  "],
      },
    ];

    // Act
    const state = getOptions(rawOptions);

    // Assert
    expect(state).toStrictEqual({
      allowInFiles: ["src/index.ts"],
      testFilePatterns: ["tests/**/*.ts"],
    });
  });

  it("falls back to defaults when custom arrays normalize to empty", () => {
    // Arrange
    const rawOptions = [
      {
        allowInFiles: ["   ", 123],
        testFilePatterns: [void 0],
      },
    ];

    // Act
    const state = getOptions(rawOptions);

    // Assert
    expect(state).toStrictEqual({
      allowInFiles: [...DEFAULT_ALLOW_IN_FILES],
      testFilePatterns: [...DEFAULT_TEST_FILE_PATTERNS],
    });
  });

  it("checks lintable filenames", () => {
    // Arrange
    const absolutePath = path.join(cwd(), "src", "feature.ts");

    // Act
    const result = {
      absolutePath: isLintableFilename(absolutePath),
      emptyPath: isLintableFilename(""),
      relativePath: isLintableFilename("src/feature.ts"),
    };

    // Assert
    expect(result).toStrictEqual({
      absolutePath: true,
      emptyPath: false,
      relativePath: false,
    });
  });

  it("normalizes relative repo paths", () => {
    // Arrange
    const sourcePath = path.join(cwd(), "src", "feature.ts");

    // Act
    const relativePath = toRepoRelativePosixPath(sourcePath);

    // Assert
    expect(relativePath).toBe("src/feature.ts");
  });

  it("matches allowlisted and test globs", () => {
    // Arrange
    const sourceIndexPath = path.join(cwd(), "src", "index.ts");
    const testPath = path.join(cwd(), "tests", "e2e", "demo.ts");
    const state = getOptions([]);

    // Act
    const result = {
      allowlisted: isAllowlistedFile(sourceIndexPath, state),
      testFile: isTestFile(testPath, state),
    };

    // Assert
    expect(result).toStrictEqual({
      allowlisted: true,
      testFile: true,
    });
  });

  it("returns false for non-matching patterns", () => {
    // Arrange
    const featurePath = path.join(cwd(), "src", "feature.ts");

    // Act
    const result = {
      emptyPatterns: matchesAnyPattern(featurePath, []),
      noMatch: matchesAnyPattern(featurePath, ["tests/**/*.ts"]),
    };

    // Assert
    expect(result).toStrictEqual({
      emptyPatterns: false,
      noMatch: false,
    });
  });

  it("returns undefined for paths outside the repository", () => {
    // Arrange
    const outsidePath = path.resolve(cwd(), "..", "outside", "feature.ts");

    // Act
    const relativePath = toRepoRelativePosixPath(outsidePath);

    // Assert
    expect(relativePath).toBeUndefined();
  });

  it("does not match non-lintable filenames", () => {
    // Arrange
    const nonLintablePath = "src/feature.ts";

    // Act
    const matched = matchesAnyPattern(nonLintablePath, ["src/**/*.ts"]);

    // Assert
    expect(matched).toBe(false);
  });
});
