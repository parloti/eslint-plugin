import type { AST, Rule } from "eslint";
import type * as ESTree from "estree";

import { SourceCode } from "eslint";
import { describe, expect, it } from "vitest";

import { reportExample } from "./reporting";

/**
 * Creates createProgramAst.
 * @param sourceText Input sourceText value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createProgramAst("sourceText");
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

/** Configuration for a single reportExample run. */
interface RunExampleOptions {
  /** Comment overrides applied on top of the default fixture. */
  comment?: Partial<Pick<ESTree.Comment, "loc" | "range">> | undefined;

  /** Example content text passed to the rule. */
  content: string;

  /** Raw comment value text passed to the rule. */
  value: string;
}

/** Result of a single reportExample run. */
interface RunExampleResult {
  /** Report descriptor captured from context.report. */
  descriptor: Rule.ReportDescriptor | undefined;

  /** SourceCode instance used for the run. */
  sourceCode: SourceCode;
}

/**
 * Runs reportExample against an in-memory SourceCode and captures reports.
 * @param options Configuration for the run.
 * @returns Captured descriptor and source code.
 * @example
 * ```typescript
 * const { descriptor } = runReportExample({ content: "ok()", value: "*\n * @example ok()" });
 * ```
 */
const runReportExample = (options: RunExampleOptions): RunExampleResult => {
  const sourceCode = new SourceCode("", createProgramAst(""));
  let descriptor: Rule.ReportDescriptor | undefined;
  const report = ((captured: Rule.ReportDescriptor): void => {
    descriptor = captured;
  }) as Rule.RuleContext["report"];

  reportExample({
    comment: {
      loc: { end: { column: 0, line: 1 }, start: { column: 0, line: 1 } },
      range: [0, 2],
      type: "Block",
      value: options.value,
      ...options.comment,
    },
    context: { report, sourceCode } as Rule.RuleContext,
    example: {
      content: options.content,
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: "",
      startOffset: 0,
    },
    hasOtherExamples: false,
  });

  return { descriptor, sourceCode };
};

describe("require example language reporting", () => {
  it("skips reporting when example content is valid", () => {
    // Act
    const { descriptor } = runReportExample({
      content: "```typescript\nok\n```",
      value: "*\n * @example\n * ```typescript\n * ok\n * ```",
    });

    // Assert
    expect(descriptor).toBeUndefined();
  });

  it("reports when example content is invalid", () => {
    // Act
    const { descriptor } = runReportExample({
      content: "ok()",
      value: "*\n * @example ok()",
    });

    // Assert
    expect(descriptor).toMatchObject({ messageId: "missingFence" });
  });

  it("reports a suggestion with the addFence message for missing fences", () => {
    // Act
    const { descriptor } = runReportExample({
      content: "ok()",
      value: "*\n * @example ok()",
    });

    // Assert
    expect(descriptor?.suggest).toMatchObject([{ messageId: "addFence" }]);
  });

  it("reports a suggestion with the addLanguage message for missing languages", () => {
    // Act
    const { descriptor } = runReportExample({
      content: "```\nok\n```",
      value: "*\n * @example\n * ```\n * ok\n * ```",
    });

    // Assert
    expect(descriptor).toMatchObject({ messageId: "missingLanguage" });
    expect(descriptor?.suggest).toMatchObject([{ messageId: "addLanguage" }]);
  });

  it("reports a suggestion with the removeEmptyExample message for empty fences", () => {
    // Act
    const { descriptor } = runReportExample({
      content: "```typescript\n```",
      value: "*\n * @example\n * ```typescript\n * ```",
    });

    // Assert
    expect(descriptor).toMatchObject({ messageId: "emptyExample" });
    expect(descriptor?.suggest).toMatchObject([
      { messageId: "removeEmptyExample" },
    ]);
  });

  it("falls back to reporting on the AST node when location is unavailable", () => {
    // Act
    const { descriptor, sourceCode } = runReportExample({
      comment: { loc: void 0 },
      content: "plain text",
      value: "*\n * @example plain text",
    });

    // Assert
    expect(descriptor).toMatchObject({
      messageId: "missingFence",
      node: sourceCode.ast,
    });
  });

  it("reports contentOutsideFence without an autofix", () => {
    // Act
    const { actualFallbackFixes, descriptor } = (() => {
      const run = runReportExample({
        content: "```typescript\nok\n```\noutside",
        value: "*\n * @example mixed fence",
      });
      const fixes =
        typeof run.descriptor?.fix === "function"
          ? run.descriptor.fix({} as Rule.RuleFixer)
          : [];

      return { actualFallbackFixes: fixes, descriptor: run.descriptor };
    })();

    // Assert
    expect(descriptor).toMatchObject({ messageId: "contentOutsideFence" });
    expect(descriptor).toHaveProperty("fix");
    expect(actualFallbackFixes).toStrictEqual([]);
  });

  it("omits fixes when comment ranges are unavailable", () => {
    // Act
    const { descriptor } = runReportExample({
      comment: { range: void 0 },
      content: "plain text",
      value: "*\n * @example plain text",
    });

    // Assert
    expect(descriptor?.fix).toBeUndefined();
  });
});
