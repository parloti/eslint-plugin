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
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeFeature(filePath);
        return runRule(filePath, allowAllFolders);
      })();

      // Assert
      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("missingBarrel");
    });

    it("does not report when enforcing and barrel exists", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeBarrel(barrelPath);
        writeFeature(filePath);
        return runRule(filePath, allowAllFolders);
      })();

      // Assert
      expect(reports).toStrictEqual([]);
    });
  });

  describe("options", () => {
    it("reports when barrel files are forbidden", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");

      // Act
      const reports = (() => {
        writeBarrel(barrelPath);
        return runRule(barrelPath, {
          ...allowAllFolders,
          enforce: false,
        });
      })();

      // Assert
      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("forbiddenBarrel");
    });

    it("respects custom barrel names", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "barrel.ts");
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeBarrel(barrelPath);
        writeFeature(filePath);
        return runRule(filePath, {
          ...allowAllFolders,
          names: ["barrel.ts"],
        });
      })();

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("accepts a single barrel name string", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "exports.ts");
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeBarrel(barrelPath);
        writeFeature(filePath);
        return runRule(filePath, {
          ...allowAllFolders,
          names: "exports.ts",
        });
      })();

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("skips when filename is not absolute", () => {
      // Arrange
      const filePath = "relative.ts";

      // Act
      const reports = runRule(filePath, allowAllFolders);

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("does not report when names resolve empty", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeFeature(filePath);
        return runRule(filePath, {
          ...allowAllFolders,
          names: [""],
        });
      })();

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("treats blank string names as empty", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeFeature(filePath);
        return runRule(filePath, {
          ...allowAllFolders,
          names: "   ",
        });
      })();

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("skips forbidden check for non-barrel files", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeFeature(filePath);
        return runRule(filePath, {
          ...allowAllFolders,
          enforce: false,
        });
      })();

      // Assert
      expect(reports).toStrictEqual([]);
    });
  });

  describe("folders", () => {
    it("accepts a folder string option", () => {
      // Arrange
      const directory = createRepoDirectory("src");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeFeature(filePath);
        return runRule(filePath, { folders: "src/**" });
      })();

      // Assert
      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("missingBarrel");
    });

    it("defaults to src folder only", () => {
      // Arrange
      const directory = createRepoDirectory("src");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeFeature(filePath);
        return runRule(filePath);
      })();

      // Assert
      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("missingBarrel");
    });

    it("skips when folder does not match", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeFeature(filePath);
        return runRule(filePath, { folders: ["src/**"] });
      })();

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("skips when folders list is empty", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeFeature(filePath);
        return runRule(filePath, { folders: [] });
      })();

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("skips when folder string is blank", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeFeature(filePath);
        return runRule(filePath, { folders: "   " });
      })();

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("skips when file is outside repo", () => {
      // Arrange
      const filePath = path.resolve(process.cwd(), "..", "outside.ts");

      // Act
      const reports = runRule(filePath, allowAllFolders);

      // Assert
      expect(reports).toStrictEqual([]);
    });
  });

  describe("caching", () => {
    it("reuses cached barrel presence", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");
      const filePath = path.join(directory, "feature.ts");
      writeBarrel(barrelPath);

      // Act
      const [first, second] = (() => {
        writeFeature(filePath);
        return [
          runRule(filePath, allowAllFolders),
          runRule(filePath, allowAllFolders),
        ];
      })();

      // Assert
      expect(first).toStrictEqual([]);
      expect(second).toStrictEqual([]);
    });

    it("avoids duplicate reports for missing barrels", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);

      // Act
      const [first, second] = [
        runRule(filePath, allowAllFolders),
        runRule(filePath, allowAllFolders),
      ];

      // Assert
      expect(first).toHaveLength(1);
      expect(second).toStrictEqual([]);
    });
  });
});
