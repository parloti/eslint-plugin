import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { RequireTestCompanionOptions } from "./types";

import {
  cleanupTemporaryDirectories,
  createTemporaryFile,
  createTemporaryPair,
  runRule,
} from "./require-test-companion-test-helpers";

describe("require-test-companion rule", () => {
  afterEach(cleanupTemporaryDirectories);

  it("reports missing test companion", () => {
    // Arrange
    const filePath = createTemporaryFile("tmp", "feature.ts");
    const options = { enforceIn: ["**"] };

    // Act
    const reports = runRule(filePath, options);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("missingTest");
  });

  it("does not report when test companion exists", () => {
    // Arrange
    const [filePath] = createTemporaryPair(
      "tmp",
      "feature.ts",
      "feature.spec.ts",
    );

    // Act
    const reports = runRule(filePath, { enforceIn: ["**"] });

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("reports missing source for test", () => {
    // Arrange
    const specPath = createTemporaryFile("tmp", "feature.test.ts");
    const options = { enforceIn: ["**"] };

    // Act
    const reports = runRule(specPath, options);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("missingSource");
  });

  it("does not report when source exists for test", () => {
    // Arrange
    const [, specPath] = createTemporaryPair(
      "tmp",
      "feature.ts",
      "feature.test.ts",
    );

    // Act
    const reports = runRule(specPath, { enforceIn: ["**"] });

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("reports missing source for suffixed tests", () => {
    // Arrange
    const specPath = createTemporaryFile("tmp", "feature.extra.spec.ts");
    const options = { enforceIn: ["**"] };

    // Act
    const reports = runRule(specPath, options);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("missingSource");
  });
});

describe("require-test-companion rule edge cases", () => {
  afterEach(cleanupTemporaryDirectories);

  it("skips when filename is not absolute", () => {
    // Arrange
    const filePath = "relative.ts";
    const options = { enforceIn: ["**"] };

    // Act
    const reports = runRule(filePath, options);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips declaration files", () => {
    // Arrange
    const filePath = createTemporaryFile("tmp", "types.d.ts");

    // Act
    const reports = runRule(filePath, { enforceIn: ["**"] });

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips empty base stem for sources", () => {
    // Arrange
    const filePath = createTemporaryFile("tmp", ".ts");

    // Act
    const reports = runRule(filePath, { enforceIn: ["**"] });

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips empty base stem for tests", () => {
    // Arrange
    const filePath = createTemporaryFile("tmp", ".spec.ts");

    // Act
    const reports = runRule(filePath, { enforceIn: ["**"] });

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips when path is outside cwd", () => {
    // Arrange
    const filePath = path.join(process.cwd(), "..", "outside.ts");

    // Act
    const reports = runRule(filePath, { enforceIn: ["**"] });

    // Assert
    expect(reports).toStrictEqual([]);
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
    const reports = runRule(filePath, options);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips ignored index.ts by default", () => {
    // Arrange
    const filePath = createTemporaryFile("src", "index.ts");

    // Act
    const reports = runRule(filePath);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("respects custom test suffixes", () => {
    // Arrange
    const [filePath] = createTemporaryPair(
      "tmp",
      "feature.ts",
      "feature.unit.ts",
    );

    // Act
    const reports = runRule(filePath, {
      enforceIn: ["**"],
      testSuffixes: ["unit"],
    });

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("accepts string test suffixes", () => {
    // Arrange
    const filePath = createTemporaryFile("tmp", "feature.ts");
    const options = {
      enforceIn: "**",
      ignorePatterns: ["", "**/feature.ts", "123"],
    } satisfies RequireTestCompanionOptions;

    // Act
    const reports = runRule(filePath, options);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("reports when ignore patterns are empty", () => {
    // Arrange
    const filePath = createTemporaryFile("tmp", "feature.ts");
    const options: RequireTestCompanionOptions = {
      enforceIn: ["**"],
      ignorePatterns: [],
    };

    // Act
    const reports = runRule(filePath, options);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("missingTest");
  });
});
