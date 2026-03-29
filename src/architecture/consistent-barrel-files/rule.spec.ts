import type { Rule } from "eslint";

import { SourceCode } from "eslint";
import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import { afterEach, describe, expect, it } from "vitest";

import type { ConsistentBarrelFilesOptions } from "./types";

import { consistentBarrelFilesRule } from "./rule";
import { createProgram, createRepoDirectory } from "./test-helpers";
import { writeBarrel, writeFeature } from "./test-helpers.file-writers";

/** Type definition for rule data. */
interface RuleReport {
  /** MessageId helper value. */
  messageId?: string;
}

/**
 * Runs the rule with a fake program for the given filename.
 * @param filename Target file path.
 * @param options Rule options when provided.
 * @returns The captured rule reports.
 * @example
 * ```typescript
 * const reports = runRule("index.ts");
 * ```
 */
const runRule = (
  filename: string,
  options?: ConsistentBarrelFilesOptions,
): RuleReport[] => {
  const reports: RuleReport[] = [];
  const sourceCode = new SourceCode("", createProgram([]));
  const context = {
    cwd: cwd(),
    filename,
    id: "consistent-barrel-files",
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    options: options === void 0 ? [] : [options],
    parserOptions: {},
    parserPath: void 0,
    physicalFilename: filename,
    report: (report: Rule.ReportDescriptor) => {
      const messageId = "messageId" in report ? report.messageId : void 0;
      const entry: RuleReport = {};
      if (messageId !== void 0) {
        entry.messageId = messageId;
      }
      reports.push(entry);
    },
    settings: {},
    sourceCode,
  } as unknown as Rule.RuleContext;

  const listeners = consistentBarrelFilesRule.create(context);
  const programNode = context.sourceCode.ast;
  const programListener = listeners.Program;

  programListener?.(programNode);

  return reports;
};

describe("consistent-barrel-files rule", () => {
  const temporaryDirectories: string[] = [];
  const defaultOptions: ConsistentBarrelFilesOptions = {};

  afterEach((): void => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  describe("enforcement", (): void => {
    it("reports when enforcing and barrel is missing", (): void => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);

      // Act
      const reports = runRule(filePath, defaultOptions);

      // Assert
      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("missingBarrel");
    });

    it("does not report when enforcing and barrel exists", (): void => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");
      const filePath = path.join(directory, "feature.ts");
      writeBarrel(barrelPath);
      writeFeature(filePath);

      // Act
      const reports = runRule(filePath, defaultOptions);

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("does not treat declaration barrels as satisfying the requirement", (): void => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const declarationBarrelPath = path.join(directory, "index.d.ts");
      const filePath = path.join(directory, "feature.ts");
      writeFileSync(
        declarationBarrelPath,
        "export interface FeatureDeclaration {}",
        "utf8",
      );
      writeFeature(filePath);

      // Act
      const reports = runRule(filePath, defaultOptions);

      // Assert
      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("missingBarrel");
    });
  });

  describe("options", (): void => {
    it("reports when barrel files are forbidden", (): void => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");
      const filePath = path.join(directory, "feature.ts");
      writeBarrel(barrelPath);
      writeFeature(filePath);

      // Act
      const reports = runRule(barrelPath, { enforce: false });

      // Assert
      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("forbiddenBarrel");
    });

    it("respects custom barrel names", (): void => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "barrel.ts");
      const filePath = path.join(directory, "feature.ts");
      writeBarrel(barrelPath);
      writeFeature(filePath);

      // Act
      const reports = runRule(filePath, { allowedNames: ["barrel"] });

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("falls back to the default barrel name when allowedNames is empty", (): void => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");
      const filePath = path.join(directory, "feature.ts");
      writeBarrel(barrelPath);
      writeFeature(filePath);

      // Act
      const reports = runRule(filePath, { allowedNames: [] });

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("skips when filename is not absolute", (): void => {
      // Arrange
      const filePath = "relative.ts";

      // Act
      const reports = runRule(filePath, defaultOptions);

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("does not report forbidden barrels when the folder has no module files besides the barrel", (): void => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");
      writeBarrel(barrelPath);

      // Act
      const reports = runRule(barrelPath, { enforce: false });

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("skips forbidden check for non-barrel files", (): void => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);

      // Act
      const reports = runRule(filePath, { enforce: false });

      // Assert
      expect(reports).toStrictEqual([]);
    });
  });

  describe("scope", (): void => {
    it("defaults to all repo folders", (): void => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);

      // Act
      const reports = runRule(filePath);

      // Assert
      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("missingBarrel");
    });

    it("skips when file is outside repo", (): void => {
      // Arrange
      const filePath = path.resolve(cwd(), "..", "outside.ts");

      // Act
      const reports = runRule(filePath, defaultOptions);

      // Assert
      expect(reports).toStrictEqual([]);
    });
  });
});
