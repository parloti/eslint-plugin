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
} from "./no-unused-exports-options";

describe("no-unused-exports options", () => {
  it("builds default options", () => {
    // Arrange
    const rawOptions: [] = [];

    // Act
    const actualState = getOptions(rawOptions);

    // Assert
    expect(actualState).toStrictEqual({
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
    const actualState = getOptions(rawOptions);

    // Assert
    expect(actualState).toStrictEqual({
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
    const actualState = getOptions(rawOptions);

    // Assert
    expect(actualState).toStrictEqual({
      allowInFiles: [...DEFAULT_ALLOW_IN_FILES],
      testFilePatterns: [...DEFAULT_TEST_FILE_PATTERNS],
    });
  });

  it("checks lintable filenames", () => {
    // Arrange
    const absolutePath = path.join(cwd(), "src", "feature.ts");

    // Act
    const actualResult = {
      absolutePath: isLintableFilename(absolutePath),
      emptyPath: isLintableFilename(""),
      relativePath: isLintableFilename("src/feature.ts"),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      absolutePath: true,
      emptyPath: false,
      relativePath: false,
    });
  });

  it("matches allowlist using repo-relative normalization", () => {
    // Arrange
    const sourcePath = path.join(cwd(), "src", "index.ts");
    const state = getOptions([]);

    // Act
    const actualAllowlisted = isAllowlistedFile(sourcePath, state);

    // Assert
    expect(actualAllowlisted).toBe(true);
  });

  it("matches allowlisted and test globs", () => {
    // Arrange
    const sourceIndexPath = path.join(cwd(), "src", "index.ts");
    const testPath = path.join(cwd(), "tests", "e2e", "demo.ts");
    const state = getOptions([]);

    // Act
    const actualResult = {
      allowlisted: isAllowlistedFile(sourceIndexPath, state),
      testFile: isTestFile(testPath, state),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      allowlisted: true,
      testFile: true,
    });
  });

  it("returns false for non-matching allowlist and test patterns", () => {
    // Arrange
    const featurePath = path.join(cwd(), "src", "feature.ts");
    const state = getOptions([
      {
        allowInFiles: ["tests/**/*.ts"],
        testFilePatterns: ["tests/**/*.ts"],
      },
    ]);

    // Act
    const actualResult = {
      allowlisted: isAllowlistedFile(featurePath, state),
      testFile: isTestFile(featurePath, state),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      allowlisted: false,
      testFile: false,
    });
  });

  it("returns false for paths outside the repository", () => {
    // Arrange
    const outsidePath = path.resolve(cwd(), "..", "outside", "feature.ts");
    const state = getOptions([]);

    // Act
    const actualResult = {
      allowlisted: isAllowlistedFile(outsidePath, state),
      testFile: isTestFile(outsidePath, state),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      allowlisted: false,
      testFile: false,
    });
  });

  it("does not match non-lintable filenames", () => {
    // Arrange
    const nonLintablePath = "src/feature.ts";
    const state = getOptions([]);

    // Act
    const actualResult = {
      allowlisted: isAllowlistedFile(nonLintablePath, state),
      testFile: isTestFile(nonLintablePath, state),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      allowlisted: false,
      testFile: false,
    });
  });
});
