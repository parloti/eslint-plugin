import type { AST, Rule } from "eslint";

import { SourceCode } from "eslint";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { ConsistentBarrelFilesOptions } from "./types";

import { consistentBarrelFilesRule } from "./rule";
import { createRepoDirectory, writeBarrel, writeFeature } from "./test-helpers";

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
  const programAst: AST.Program = {
    body: [],
    comments: [],
    loc: {
      end: { column: 0, line: 1 },
      start: { column: 0, line: 1 },
    },
    range: [0, 0],
    sourceType: "module",
    tokens: [],
    type: "Program",
  };
  const sourceCode = new SourceCode("", programAst);
  const context: Rule.RuleContext = {
    cwd: process.cwd(),
    filename,
    getCwd: () => process.cwd(),
    getFilename: () => filename,
    getPhysicalFilename: () => filename,
    getSourceCode: () => sourceCode,
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
  };

  const listeners = consistentBarrelFilesRule.create(context);
  const programNode = context.sourceCode.ast;
  const programListener = listeners.Program;

  programListener?.(programNode);

  return reports;
};

describe("consistent-barrel-files rule", () => {
  const temporaryDirectories: string[] = [];
  const allowAllFolders: ConsistentBarrelFilesOptions = { folders: ["**"] };

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  describe("enforcement", () => {
    it("reports when enforcing and barrel is missing", () => {
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);
      const reports = runRule(filePath, allowAllFolders);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("missingBarrel");
    });

    it("does not report when enforcing and barrel exists", () => {
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");
      const filePath = path.join(directory, "feature.ts");
      writeBarrel(barrelPath);
      writeFeature(filePath);
      const reports = runRule(filePath, allowAllFolders);

      expect(reports).toStrictEqual([]);
    });
  });

  describe("options", () => {
    it("reports when barrel files are forbidden", () => {
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");
      writeBarrel(barrelPath);
      const reports = runRule(barrelPath, {
        ...allowAllFolders,
        enforce: false,
      });

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("forbiddenBarrel");
    });

    it("respects custom barrel names", () => {
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "barrel.ts");
      const filePath = path.join(directory, "feature.ts");
      writeBarrel(barrelPath);
      writeFeature(filePath);
      const reports = runRule(filePath, {
        ...allowAllFolders,
        names: ["barrel.ts"],
      });

      expect(reports).toStrictEqual([]);
    });

    it("accepts a single barrel name string", () => {
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "exports.ts");
      const filePath = path.join(directory, "feature.ts");
      writeBarrel(barrelPath);
      writeFeature(filePath);
      const reports = runRule(filePath, {
        ...allowAllFolders,
        names: "exports.ts",
      });

      expect(reports).toStrictEqual([]);
    });

    it("skips when filename is not absolute", () => {
      const reports = runRule("relative.ts", allowAllFolders);

      expect(reports).toStrictEqual([]);
    });

    it("does not report when names resolve empty", () => {
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);
      const reports = runRule(filePath, {
        ...allowAllFolders,
        names: [""],
      });

      expect(reports).toStrictEqual([]);
    });

    it("treats blank string names as empty", () => {
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);
      const reports = runRule(filePath, {
        ...allowAllFolders,
        names: "   ",
      });

      expect(reports).toStrictEqual([]);
    });

    it("skips forbidden check for non-barrel files", () => {
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);
      const reports = runRule(filePath, {
        ...allowAllFolders,
        enforce: false,
      });

      expect(reports).toStrictEqual([]);
    });
  });

  describe("folders", () => {
    it("accepts a folder string option", () => {
      const directory = createRepoDirectory("src");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);
      const reports = runRule(filePath, { folders: "src/**" });

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("missingBarrel");
    });

    it("defaults to src folder only", () => {
      const directory = createRepoDirectory("src");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);
      const reports = runRule(filePath);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("missingBarrel");
    });

    it("skips when folder does not match", () => {
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);
      const reports = runRule(filePath, { folders: ["src/**"] });

      expect(reports).toStrictEqual([]);
    });

    it("skips when folders list is empty", () => {
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);
      const reports = runRule(filePath, { folders: [] });

      expect(reports).toStrictEqual([]);
    });

    it("skips when folder string is blank", () => {
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);
      const reports = runRule(filePath, { folders: "   " });

      expect(reports).toStrictEqual([]);
    });

    it("skips when file is outside repo", () => {
      const filePath = path.resolve(process.cwd(), "..", "outside.ts");
      const reports = runRule(filePath, allowAllFolders);

      expect(reports).toStrictEqual([]);
    });
  });

  describe("caching", () => {
    it("reuses cached barrel presence", () => {
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");
      const filePath = path.join(directory, "feature.ts");
      writeBarrel(barrelPath);
      writeFeature(filePath);
      const first = runRule(filePath, allowAllFolders);
      const second = runRule(filePath, allowAllFolders);

      expect(first).toStrictEqual([]);
      expect(second).toStrictEqual([]);
    });

    it("avoids duplicate reports for missing barrels", () => {
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);
      const first = runRule(filePath, allowAllFolders);
      const second = runRule(filePath, allowAllFolders);

      expect(first).toHaveLength(1);
      expect(second).toStrictEqual([]);
    });
  });
});
