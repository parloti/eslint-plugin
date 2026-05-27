import path from "node:path";
import { cwd } from "node:process";
import { afterEach, describe, expect, it } from "vitest";

import type { RequireTestCompanionOptions } from "./types";

import {
  cleanupTemporaryDirectories,
  createTemporaryFile,
  createTemporaryPair,
  runRule,
} from "../../../shared/test-utils/require-test-companion-test-helpers";

describe("require-test-companion rule", () => {
  afterEach(cleanupTemporaryDirectories);

  it("does not report source files without test companions", () => {
    // Arrange
    const filePath = createTemporaryFile("tmp", "feature.ts");
    const options = { enforceIn: ["**"] };

    // Act
    const actualReports = runRule(filePath, options);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("does not report when test companion exists", () => {
    // Arrange
    const [filePath] = createTemporaryPair(
      "tmp",
      "feature.ts",
      "feature.spec.ts",
    );

    // Act
    const actualReports = runRule(filePath, { enforceIn: ["**"] });

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("reports missing source for test", () => {
    // Arrange
    const specPath = createTemporaryFile("tmp", "feature.test.ts");
    const options = { enforceIn: ["**"] };

    // Act
    const actualReports = runRule(specPath, options);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("missingSource");
  });

  it("does not report when source exists for test", () => {
    // Arrange
    const [, specPath] = createTemporaryPair(
      "tmp",
      "feature.ts",
      "feature.test.ts",
    );

    // Act
    const actualReports = runRule(specPath, { enforceIn: ["**"] });

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("reports missing source for suffixed tests", () => {
    // Arrange
    const specPath = createTemporaryFile("tmp", "feature.extra.spec.ts");
    const options = { enforceIn: ["**"] };

    // Act
    const actualReports = runRule(specPath, options);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("missingSource");
  });
});

describe("require-test-companion rule edge cases", () => {
  afterEach(cleanupTemporaryDirectories);

  it("skips when filename is not absolute", () => {
    // Arrange
    const filePath = "relative.ts";
    const options = { enforceIn: ["**"] };

    // Act
    const actualReports = runRule(filePath, options);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("skips declaration files", () => {
    // Arrange
    const filePath = createTemporaryFile("tmp", "types.d.ts");

    // Act
    const actualReports = runRule(filePath, { enforceIn: ["**"] });

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("skips empty base stem for sources", () => {
    // Arrange
    const filePath = createTemporaryFile("tmp", ".ts");

    // Act
    const actualReports = runRule(filePath, { enforceIn: ["**"] });

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("skips empty base stem for tests", () => {
    // Arrange
    const filePath = createTemporaryFile("tmp", ".spec.ts");

    // Act
    const actualReports = runRule(filePath, { enforceIn: ["**"] });

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("skips when path is outside cwd", () => {
    // Arrange
    const filePath = path.join(cwd(), "..", "outside.ts");

    // Act
    const actualReports = runRule(filePath, { enforceIn: ["**"] });

    // Assert
    expect(actualReports).toStrictEqual([]);
  });
});

describe("require-test-companion rule ignore patterns", () => {
  afterEach(cleanupTemporaryDirectories);

  it("skips when enforceIn is blank", () => {
    // Arrange
    const filePath = createTemporaryFile("tmp", "feature.ts");
    const options: RequireTestCompanionOptions = {
      enforceIn: "   ",
      ignorePatterns: [],
    };

    // Act
    const actualReports = runRule(filePath, options);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("skips ignored index.ts by default", () => {
    // Arrange
    const filePath = createTemporaryFile("src", "index.ts");

    // Act
    const actualReports = runRule(filePath);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("respects custom test suffixes", () => {
    // Arrange
    const [filePath] = createTemporaryPair(
      "tmp",
      "feature.ts",
      "feature.unit.ts",
    );

    // Act
    const actualReports = runRule(filePath, {
      enforceIn: ["**"],
      testSuffixes: ["unit"],
    });

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("accepts string test suffixes", () => {
    // Arrange
    const filePath = createTemporaryFile("tmp", "feature.ts");
    const options = {
      enforceIn: "**",
      ignorePatterns: ["", "**/feature.ts", "123"],
    } satisfies RequireTestCompanionOptions;

    // Act
    const actualReports = runRule(filePath, options);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("does not report source files when ignore patterns are empty", () => {
    // Arrange
    const filePath = createTemporaryFile("tmp", "feature.ts");
    const options: RequireTestCompanionOptions = {
      enforceIn: ["**"],
      ignorePatterns: [],
    };

    // Act
    const actualReports = runRule(filePath, options);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("does not report missing source for ignored test files", () => {
    // Arrange
    const specPath = createTemporaryFile("tmp", "feature.spec.ts");

    // Act
    const actualReports = runRule(specPath, {
      enforceIn: ["**"],
      ignorePatterns: ["**/*.spec.ts"],
    });

    // Assert
    expect(actualReports).toStrictEqual([]);
  });
});
