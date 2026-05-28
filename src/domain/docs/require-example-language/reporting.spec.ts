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
    const actualResult = (() => {
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

      return "completed";
    })();

    // Assert
    expect(actualResult).toBe("completed");
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
    const actualResult = (() => {
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

      return "completed";
    })();

    // Assert
    expect(actualResult).toBe("completed");
    expect(reportCalls).toBe(1);
    expect(reportDescriptor).toMatchObject({ messageId: "missingFence" });
  });

  it("falls back to reporting on the AST node when location is unavailable", () => {
    // Arrange
    const sourceCode = new SourceCode("", createProgramAst(""));
    let reportDescriptor: Rule.ReportDescriptor | undefined;
    const report = ((descriptor: Rule.ReportDescriptor): void => {
      reportDescriptor = descriptor;
    }) as Rule.RuleContext["report"];

    // Act
    const actualReportDescriptor = (() => {
      reportExample({
        comment: {
          loc: void 0,
          range: [0, 2],
          type: "Block",
          value: "*\n * @example plain text",
        },
        context: { report, sourceCode } as Rule.RuleContext,
        example: {
          content: "plain text",
          endIndex: 0,
          endOffset: 0,
          lineIndex: 0,
          prefix: "",
          startOffset: 0,
        },
        hasOtherExamples: false,
      });

      return reportDescriptor;
    })();

    // Assert
    expect(actualReportDescriptor).toMatchObject({
      messageId: "missingFence",
      node: sourceCode.ast,
    });
  });

  it("reports contentOutsideFence without an autofix", () => {
    // Arrange
    const sourceCode = new SourceCode("", createProgramAst(""));
    let reportDescriptor: Rule.ReportDescriptor | undefined;
    const report = ((descriptor: Rule.ReportDescriptor): void => {
      reportDescriptor = descriptor;
    }) as Rule.RuleContext["report"];

    // Act
    const actualFallbackFixes = (() => {
      reportExample({
        comment: {
          loc: { end: { column: 0, line: 1 }, start: { column: 0, line: 1 } },
          range: [0, 2],
          type: "Block",
          value: "*\n * @example mixed fence",
        },
        context: { report, sourceCode } as Rule.RuleContext,
        example: {
          content: "```typescript\nok\n```\noutside",
          endIndex: 0,
          endOffset: 0,
          lineIndex: 0,
          prefix: "",
          startOffset: 0,
        },
        hasOtherExamples: false,
      });

      const actualFixFunction = reportDescriptor?.fix;
      if (typeof actualFixFunction !== "function") {
        return [];
      }

      return actualFixFunction({} as Rule.RuleFixer);
    })();

    // Assert
    expect(reportDescriptor).toMatchObject({
      messageId: "contentOutsideFence",
    });
    expect(reportDescriptor).toHaveProperty("fix");
    expect(actualFallbackFixes).toStrictEqual([]);
  });

  it("omits fixes when comment ranges are unavailable", () => {
    // Arrange
    const sourceCode = new SourceCode("", createProgramAst(""));
    let reportDescriptor: Rule.ReportDescriptor | undefined;
    const report = ((descriptor: Rule.ReportDescriptor): void => {
      reportDescriptor = descriptor;
    }) as Rule.RuleContext["report"];

    // Act
    const actualFix = (() => {
      reportExample({
        comment: {
          loc: { end: { column: 0, line: 1 }, start: { column: 0, line: 1 } },
          range: void 0,
          type: "Block",
          value: "*\n * @example plain text",
        },
        context: { report, sourceCode } as Rule.RuleContext,
        example: {
          content: "plain text",
          endIndex: 0,
          endOffset: 0,
          lineIndex: 0,
          prefix: "",
          startOffset: 0,
        },
        hasOtherExamples: false,
      });

      return reportDescriptor?.fix;
    })();

    // Assert
    expect(actualFix).toBeUndefined();
  });
});
