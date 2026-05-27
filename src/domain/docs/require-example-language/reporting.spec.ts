import type { AST, Rule } from "eslint";

import { SourceCode } from "eslint";
import { describe, expect, it } from "vitest";

import { reportExample } from "./reporting";

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
      },
      context: { report, sourceCode } as Rule.RuleContext,
      example: {
        content: "```typescript\nok\n```",
        endIndex: 0,
        endOffset: 0,
        lineIndex: 0,
        prefix: "",
        startOffset: 0,
      },
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
      },
      context: { report, sourceCode } as Rule.RuleContext,
      example: {
        content: "ok()",
        endIndex: 0,
        endOffset: 0,
        lineIndex: 0,
        prefix: "",
        startOffset: 0,
      },
      hasOtherExamples: false,
    });

    // Assert
    expect(reportCalls).toBe(1);
    expect(reportDescriptor).toMatchObject({ messageId: "missingFence" });
  });
});
