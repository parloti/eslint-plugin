import path from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PUBLIC_API_FILES,
  DEFAULT_TEST_FILE_PATTERNS,
  getOptions,
  isLintableFilename,
  isPublicApiFile,
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
      publicApiFiles: [...DEFAULT_PUBLIC_API_FILES],
      testFilePatterns: [...DEFAULT_TEST_FILE_PATTERNS],
    });
  });

  it("normalizes custom options", () => {
    // Arrange
    const rawOptions = [
      {
        publicApiFiles: ["  src/index.ts  ", "", 1],
        testFilePatterns: ["tests/**/*.ts", "  "],
      },
    ];

    // Act
    const actualState = getOptions(rawOptions);

    // Assert
    expect(actualState).toStrictEqual({
      publicApiFiles: ["src/index.ts"],
      testFilePatterns: ["tests/**/*.ts"],
    });
  });

  it("falls back to defaults when custom arrays normalize to empty", () => {
    // Arrange
    const rawOptions = [
      {
        publicApiFiles: [" ".repeat(3), 123],
        testFilePatterns: [void 0],
      },
    ];

    // Act
    const actualState = getOptions(rawOptions);

    // Assert
    expect(actualState).toStrictEqual({
      publicApiFiles: [...DEFAULT_PUBLIC_API_FILES],
      testFilePatterns: [...DEFAULT_TEST_FILE_PATTERNS],
    });
  });

  it("checks lintable filenames", () => {
    // Arrange
    const absolutePath = path.join(cwd(), "src", "feature.ts");
    const nonSourceAbsolutePath = path.join(cwd(), "tests", "feature.ts");

    // Act
    const actualResult = {
      absolutePath: isLintableFilename(absolutePath),
      emptyPath: isLintableFilename(""),
      nonSourceAbsolutePath: isLintableFilename(nonSourceAbsolutePath),
      relativePath: isLintableFilename("src/feature.ts"),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      absolutePath: true,
      emptyPath: false,
      nonSourceAbsolutePath: false,
      relativePath: false,
    });
  });

  it("matches public API files using repo-relative normalization", () => {
    // Arrange
    const sourcePath = path.join(cwd(), "src", "index.ts");
    const state = getOptions([]);

    // Act
    const actualPublicApiFile = isPublicApiFile(sourcePath, state, cwd());

    // Assert
    expect(actualPublicApiFile).toBe(true);
  });

  it("matches public API and test globs", () => {
    // Arrange
    const sourceIndexPath = path.join(cwd(), "src", "index.ts");
    const testPath = path.join(cwd(), "tests", "e2e", "demo.e2e.ts");
    const state = getOptions([]);

    // Act
    const actualResult = {
      publicApiFile: isPublicApiFile(sourceIndexPath, state, cwd()),
      testFile: isTestFile(testPath, state, cwd()),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      publicApiFile: true,
      testFile: true,
    });
  });

  it("returns false for non-matching public API and test patterns", () => {
    // Arrange
    const featurePath = path.join(cwd(), "src", "feature.ts");
    const state = getOptions([
      {
        publicApiFiles: ["tests/**/*.ts"],
        testFilePatterns: ["tests/**/*.ts"],
      },
    ]);

    // Act
    const actualResult = {
      publicApiFile: isPublicApiFile(featurePath, state, cwd()),
      testFile: isTestFile(featurePath, state, cwd()),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      publicApiFile: false,
      testFile: false,
    });
  });

  it("returns false for paths outside the repository", () => {
    // Arrange
    const outsidePath = path.resolve(cwd(), "..", "outside", "feature.ts");
    const state = getOptions([]);

    // Act
    const actualResult = {
      publicApiFile: isPublicApiFile(outsidePath, state, cwd()),
      testFile: isTestFile(outsidePath, state, cwd()),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      publicApiFile: false,
      testFile: false,
    });
  });

  it("does not match non-lintable filenames", () => {
    // Arrange
    const nonLintablePath = "src/feature.ts";
    const state = getOptions([]);

    // Act
    const actualResult = {
      publicApiFile: isPublicApiFile(nonLintablePath, state, cwd()),
      testFile: isTestFile(nonLintablePath, state, cwd()),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      publicApiFile: false,
      testFile: false,
    });
  });

  it("uses the provided repository root for pattern matching", () => {
    // Arrange
    const repoRoot = path.join(cwd(), "tmp-fixture-root");
    const sourceIndexPath = path.join(repoRoot, "src", "index.ts");
    const testPath = path.join(repoRoot, "tests", "feature.spec.ts");
    const state = getOptions([]);

    // Act
    const actualResult = {
      publicApiFile: isPublicApiFile(sourceIndexPath, state, repoRoot),
      testFile: isTestFile(testPath, state, repoRoot),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      publicApiFile: true,
      testFile: true,
    });
  });

  it("returns false when the repository root is not absolute", () => {
    // Arrange
    const sourceIndexPath = path.join(cwd(), "src", "index.ts");
    const state = getOptions([]);

    // Act
    const actualResult = {
      publicApiFile: isPublicApiFile(sourceIndexPath, state, "src"),
      testFile: isTestFile(sourceIndexPath, state, "src"),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      publicApiFile: false,
      testFile: false,
    });
  });

  it("returns false when the configured pattern list is empty", () => {
    // Arrange
    const sourceIndexPath = path.join(cwd(), "src", "index.ts");
    const state = {
      publicApiFiles: [],
      testFilePatterns: [],
    };

    // Act
    const actualResult = {
      publicApiFile: isPublicApiFile(sourceIndexPath, state, cwd()),
      testFile: isTestFile(sourceIndexPath, state, cwd()),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      publicApiFile: false,
      testFile: false,
    });
  });
});
