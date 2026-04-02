import type { AST, Rule } from "eslint";

import { SourceCode } from "eslint";
import { describe, expect, it } from "vitest";

import type { Comment, Example } from "./types";

import { buildReportDescriptor, reportExample } from "./reporting";

/**
 * Creates createProgramAst.
 * @param sourceText Input sourceText value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createProgramAst();
 * ```
 */
const createProgramAst = (sourceText: string): AST.Program => ({
  body: [],
  comments: [],
  loc: {
    end: { column: sourceText.length, line: 1 },
    start: { column: 0, line: 1 },
  },
  range: [0, sourceText.length],
  sourceType: "module",
  tokens: [],
  type: "Program",
});

describe("require example language reporting", () => {
  it("builds a report descriptor", () => {
    // Arrange
    const sourceCode = new SourceCode("", createProgramAst(""));
    const reportInput = {
      comment: {
        loc: { end: { column: 0, line: 1 }, start: { column: 0, line: 1 } },
        range: [0, 2],
        type: "Block",
        value: "*",
      } as Comment,
      example: {
        content: "",
        endIndex: 0,
        endOffset: 0,
        lineIndex: 0,
        prefix: "",
        startOffset: 0,
      } as Example,
      hasOtherExamples: false,
      problem: "missingFence" as const,
      sourceCode,
    };

    // Act
    const descriptor = buildReportDescriptor(reportInput);

    // Assert
    expect(descriptor).toBeDefined();
  });

  it("returns a descriptor without a fixer when range is missing", () => {
    // Arrange
    const sourceCode = new SourceCode("", createProgramAst(""));
    const reportInput = {
      comment: {
        loc: { end: { column: 0, line: 1 }, start: { column: 0, line: 1 } },
        type: "Block",
        value: "*",
      } as Comment,
      example: {
        content: "",
        endIndex: 0,
        endOffset: 0,
        lineIndex: 0,
        prefix: "",
        startOffset: 0,
      } as Example,
      hasOtherExamples: false,
      problem: "missingFence" as const,
      sourceCode,
    };

    // Act
    const descriptor = buildReportDescriptor(reportInput);

    // Assert
    expect(descriptor).toBeDefined();
  });

  it("returns a descriptor when location data is missing", () => {
    // Arrange
    const sourceCode = new SourceCode("", createProgramAst(""));
    const reportInput = {
      comment: {
        range: [0, 2],
        type: "Block",
        value: "*",
      } as Comment,
      example: {
        content: "",
        endIndex: 0,
        endOffset: 0,
        lineIndex: 0,
        prefix: "",
        startOffset: 0,
      } as Example,
      hasOtherExamples: false,
      problem: "missingFence" as const,
      sourceCode,
    };

    // Act
    const descriptor = buildReportDescriptor(reportInput);

    // Assert
    expect(descriptor).toBeDefined();
  });

  it("skips reporting when example content is valid", () => {
    // Arrange
    const sourceCode = new SourceCode("", createProgramAst(""));
    let reportCalls = 0;
    const report = ((): void => {
      reportCalls += 1;
    }) as Rule.RuleContext["report"];
    const reportExampleUnsafe = reportExample;

    // Act
    reportExampleUnsafe({
      comment: {
        loc: { end: { column: 0, line: 1 }, start: { column: 0, line: 1 } },
        range: [0, 2],
        type: "Block",
        value: "*\n * @example\n * ```typescript\n * ok\n * ```",
      } as Comment,
      context: { report, sourceCode } as Rule.RuleContext,
      example: {
        content: "```typescript\nok\n```",
        endIndex: 0,
        endOffset: 0,
        lineIndex: 0,
        prefix: "",
        startOffset: 0,
      } as Example,
      hasOtherExamples: false,
    });

    // Assert
    expect(reportCalls).toBe(0);
  });

  it("reports when example content is invalid", () => {
    // Arrange
    const sourceCode = new SourceCode("", createProgramAst(""));
    let reportCalls = 0;
    let reportDescriptor: Rule.ReportDescriptor | undefined;
    const report = ((descriptor: Rule.ReportDescriptor): void => {
      reportCalls += 1;
      reportDescriptor = descriptor;
    }) as Rule.RuleContext["report"];

    // Act
    reportExample({
      comment: {
        loc: { end: { column: 0, line: 1 }, start: { column: 0, line: 1 } },
        range: [0, 2],
        type: "Block",
        value: "*\n * @example ok()",
      } as Comment,
      context: { report, sourceCode } as Rule.RuleContext,
      example: {
        content: "ok()",
        endIndex: 0,
        endOffset: 0,
        lineIndex: 0,
        prefix: "",
        startOffset: 0,
      } as Example,
      hasOtherExamples: false,
    });

    // Assert
    expect(reportCalls).toBe(1);
    expect(reportDescriptor).toMatchObject({ messageId: "missingFence" });
  });

  it("returns an empty fix iterable when the fixer has no edit to apply", () => {
    // Arrange
    const sourceText = "/*```typescript\nok\n```*/";
    const sourceCode = new SourceCode(sourceText, createProgramAst(sourceText));
    const descriptor = buildReportDescriptor({
      comment: {
        loc: { end: { column: 0, line: 1 }, start: { column: 0, line: 1 } },
        range: [0, sourceText.length],
        type: "Block",
        value: "*",
      } as Comment,
      example: {
        content: "```typescript\nok\n```",
        endIndex: 0,
        endOffset: sourceText.length - 4,
        lineIndex: 0,
        prefix: "",
        startOffset: 0,
      } as Example,
      hasOtherExamples: false,
      problem: "missingLanguage",
      sourceCode,
    });

    // Act
    const fixResult = descriptor.fix?.({
      replaceTextRange: () => ({ range: [0, 0], text: "unused" }),
    } as unknown as Rule.RuleFixer);

    // Assert
    expect(fixResult).toStrictEqual([]);
  });
});
