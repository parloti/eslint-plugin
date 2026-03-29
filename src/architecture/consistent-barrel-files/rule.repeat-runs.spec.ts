import type { Rule } from "eslint";

import { SourceCode } from "eslint";
import { rmSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import { afterEach, describe, expect, it } from "vitest";

import type { ConsistentBarrelFilesOptions } from "./types";

import { consistentBarrelFilesRule } from "./rule";
import { ruleRepeatRunsCompanion } from "./rule.repeat-runs";
import { createProgram, createRepoDirectory } from "./test-helpers";
import { writeBarrel, writeFeature } from "./test-helpers.file-writers";

/** Stores the first and second report arrays from repeated rule runs. */
interface RepeatedRunResult {
  /** Reports from the first rule execution. */
  first: RuleReport[];
  /** Reports from the second rule execution. */
  second: RuleReport[];
}

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
    report: (report: Rule.ReportDescriptor): void => {
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

describe("consistent-barrel-files rule repeat runs", (): void => {
  const temporaryDirectories: string[] = [];
  const defaultOptions: ConsistentBarrelFilesOptions = {};

  afterEach((): void => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("exports the repeat-runs companion value", (): void => {
    // Arrange

    // Act & Assert
    expect(ruleRepeatRunsCompanion).toBe("rule.repeat-runs");
  });

  it("re-evaluates the filesystem between runs", (): void => {
    // Arrange
    const directory = createRepoDirectory("tmp");
    temporaryDirectories.push(directory);
    const barrelPath = path.join(directory, "index.ts");
    const filePath = path.join(directory, "feature.ts");

    // Act
    const { first, second } = ((): RepeatedRunResult => {
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

  it("does not suppress repeated missing-barrel reports across runs", (): void => {
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
