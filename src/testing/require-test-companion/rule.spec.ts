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
    const filePath = createTemporaryFile("tmp", "feature.ts");

    const reports = runRule(filePath, { enforceIn: ["**"] });

    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("missingTest");
  });

  it("does not report when test companion exists", () => {
    const [filePath] = createTemporaryPair(
      "tmp",
      "feature.ts",
      "feature.spec.ts",
    );

    const reports = runRule(filePath, { enforceIn: ["**"] });

    expect(reports).toStrictEqual([]);
  });

  it("reports missing source for test", () => {
    const specPath = createTemporaryFile("tmp", "feature.test.ts");

    const reports = runRule(specPath, { enforceIn: ["**"] });

    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("missingSource");
  });

  it("does not report when source exists for test", () => {
    const [, specPath] = createTemporaryPair(
      "tmp",
      "feature.ts",
      "feature.test.ts",
    );

    const reports = runRule(specPath, { enforceIn: ["**"] });

    expect(reports).toStrictEqual([]);
  });

  it("reports missing source for suffixed tests", () => {
    const specPath = createTemporaryFile("tmp", "feature.extra.spec.ts");

    const reports = runRule(specPath, { enforceIn: ["**"] });

    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("missingSource");
  });
});

describe("require-test-companion rule edge cases", () => {
  afterEach(cleanupTemporaryDirectories);

  it("skips when filename is not absolute", () => {
    const reports = runRule("relative.ts", { enforceIn: ["**"] });

    expect(reports).toStrictEqual([]);
  });

  it("skips declaration files", () => {
    const filePath = createTemporaryFile("tmp", "types.d.ts");

    const reports = runRule(filePath, { enforceIn: ["**"] });

    expect(reports).toStrictEqual([]);
  });

  it("skips empty base stem for sources", () => {
    const filePath = createTemporaryFile("tmp", ".ts");

    const reports = runRule(filePath, { enforceIn: ["**"] });

    expect(reports).toStrictEqual([]);
  });

  it("skips empty base stem for tests", () => {
    const filePath = createTemporaryFile("tmp", ".spec.ts");

    const reports = runRule(filePath, { enforceIn: ["**"] });

    expect(reports).toStrictEqual([]);
  });

  it("skips when path is outside cwd", () => {
    const filePath = path.join(process.cwd(), "..", "outside.ts");

    const reports = runRule(filePath, { enforceIn: ["**"] });

    expect(reports).toStrictEqual([]);
  });
});

describe("require-test-companion rule ignore patterns", () => {
  afterEach(cleanupTemporaryDirectories);

  it("skips when enforceIn is blank", () => {
    const filePath = createTemporaryFile("tmp", "feature.ts");
    const options: RequireTestCompanionOptions = {
      enforceIn: "   ",
      ignorePatterns: [],
    };

    const reports = runRule(filePath, options);

    expect(reports).toStrictEqual([]);
  });

  it("skips ignored index.ts by default", () => {
    const filePath = createTemporaryFile("src", "index.ts");

    const reports = runRule(filePath);

    expect(reports).toStrictEqual([]);
  });

  it("respects custom test suffixes", () => {
    const [filePath] = createTemporaryPair(
      "tmp",
      "feature.ts",
      "feature.unit.ts",
    );

    const reports = runRule(filePath, {
      enforceIn: ["**"],
      testSuffixes: ["unit"],
    });

    expect(reports).toStrictEqual([]);
  });

  it("accepts string test suffixes", () => {
    const filePath = createTemporaryFile("tmp", "feature.ts");
    const options = {
      enforceIn: "**",
      ignorePatterns: ["", "**/feature.ts", "123"],
    } satisfies RequireTestCompanionOptions;

    const reports = runRule(filePath, options);

    expect(reports).toStrictEqual([]);
  });

  it("reports when ignore patterns are empty", () => {
    const filePath = createTemporaryFile("tmp", "feature.ts");
    const options: RequireTestCompanionOptions = {
      enforceIn: ["**"],
      ignorePatterns: [],
    };

    const reports = runRule(filePath, options);

    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("missingTest");
  });
});
