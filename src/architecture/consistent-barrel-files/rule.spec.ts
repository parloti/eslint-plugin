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
  const defaultOptions: ConsistentBarrelFilesOptions = {};

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
        return runRule(filePath, defaultOptions);
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
        return runRule(filePath, defaultOptions);
      })();

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("does not treat declaration barrels as satisfying the requirement", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const declarationBarrelPath = path.join(directory, "index.d.ts");
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        fs.writeFileSync(
          declarationBarrelPath,
          "export interface FeatureDeclaration {}",
          "utf8",
        );
        writeFeature(filePath);
        return runRule(filePath, defaultOptions);
      })();

      // Assert
      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("missingBarrel");
    });
  });

  describe("options", () => {
    it("reports when barrel files are forbidden", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeBarrel(barrelPath);
        writeFeature(filePath);
        return runRule(barrelPath, {
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
          allowedNames: ["barrel"],
        });
      })();

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("falls back to the default barrel name when allowedNames is empty", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");
      const filePath = path.join(directory, "feature.ts");

      // Act
      const reports = (() => {
        writeBarrel(barrelPath);
        writeFeature(filePath);
        return runRule(filePath, {
          allowedNames: [],
        });
      })();

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("skips when filename is not absolute", () => {
      // Arrange
      const filePath = "relative.ts";

      // Act
      const reports = runRule(filePath, defaultOptions);

      // Assert
      expect(reports).toStrictEqual([]);
    });

    it("does not report forbidden barrels when the folder has no module files besides the barrel", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");

      // Act
      const reports = (() => {
        writeBarrel(barrelPath);
        return runRule(barrelPath, { enforce: false });
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
          enforce: false,
        });
      })();

      // Assert
      expect(reports).toStrictEqual([]);
    });
  });

  describe("scope", () => {
    it("defaults to all repo folders", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
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

    it("skips when file is outside repo", () => {
      // Arrange
      const filePath = path.resolve(process.cwd(), "..", "outside.ts");

      // Act
      const reports = runRule(filePath, defaultOptions);

      // Assert
      expect(reports).toStrictEqual([]);
    });
  });

  describe("repeat runs", () => {
    it("re-evaluates the filesystem between runs", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const barrelPath = path.join(directory, "index.ts");
      const filePath = path.join(directory, "feature.ts");

      // Act
      const { first, second } = (() => {
        writeFeature(filePath);
        const firstReport = runRule(filePath, defaultOptions);
        writeBarrel(barrelPath);
        const secondReport = runRule(filePath, defaultOptions);

        return { first: firstReport, second: secondReport };
      })();

      // Assert
      expect(first).toHaveLength(1);
      expect(first[0]?.messageId).toBe("missingBarrel");
      expect(second).toStrictEqual([]);
    });

    it("does not suppress repeated missing-barrel reports across runs", () => {
      // Arrange
      const directory = createRepoDirectory("tmp");
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, "feature.ts");
      writeFeature(filePath);

      // Act
      const [first, second] = [
        runRule(filePath, defaultOptions),
        runRule(filePath, defaultOptions),
      ];

      // Assert
      expect(first).toHaveLength(1);
      expect(second).toHaveLength(1);
      expect(second[0]?.messageId).toBe("missingBarrel");
    });
  });
});
