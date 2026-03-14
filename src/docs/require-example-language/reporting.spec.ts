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
    const sourceCode = new SourceCode("", createProgramAst(""));

    expect(
      buildReportDescriptor({
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
        problem: "missingFence",
        sourceCode,
      }),
    ).toBeDefined();
  });

  it("returns a descriptor without a fixer when range is missing", () => {
    const sourceCode = new SourceCode("", createProgramAst(""));

    expect(
      buildReportDescriptor({
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
        problem: "missingFence",
        sourceCode,
      }),
    ).toBeDefined();
  });

  it("returns a descriptor when location data is missing", () => {
    const sourceCode = new SourceCode("", createProgramAst(""));

    expect(
      buildReportDescriptor({
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
        problem: "missingFence",
        sourceCode,
      }),
    ).toBeDefined();
  });

  it("skips reporting when example content is valid", () => {
    const sourceCode = new SourceCode("", createProgramAst(""));
    let reportCalls = 0;
    const report = ((): void => {
      reportCalls += 1;
    }) as Rule.RuleContext["report"];
    const reportExampleUnsafe = reportExample;

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

    expect(reportCalls).toBe(0);
  });

  it("reports when example content is invalid", () => {
    const sourceCode = new SourceCode("", createProgramAst(""));
    let reportCalls = 0;
    const report = ((descriptor: Rule.ReportDescriptor): void => {
      reportCalls += 1;
      expect(descriptor).toMatchObject({ messageId: "missingFence" });
    }) as Rule.RuleContext["report"];

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

    expect(reportCalls).toBe(1);
  });
});
