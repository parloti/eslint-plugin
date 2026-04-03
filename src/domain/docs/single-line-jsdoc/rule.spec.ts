import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import { createFixer, getFixText } from "../test-helpers";
import { singleLineJsdocRule } from "./rule";

/** Type definition for rule data. */
type Comment = ReturnType<
  Rule.RuleContext["sourceCode"]["getAllComments"]
>[number];

/** Type definition for rule data. */
interface CommentOptions {
  /** EndLine field value. */
  endLine: number;
  /** Start column (optional). */
  startColumn?: number;
  /** Start line (optional). */
  startLine?: number;
}

/** Type definition for rule data. */
interface ReportEntry {
  /** Fix helper value. */
  fix?: null | Rule.ReportFixer | undefined;
  /** MessageId helper value. */
  messageId?: string;
}

/** Type definition for rule data. */
interface RuleContextState {
  /** Context field value. */
  context: Rule.RuleContext;
  /** Reports field value. */
  reports: ReportEntry[];
}

/** Type definition for rule data. */
interface SingleLineJsdocOptions {
  /** MaxLineLength helper value. */
  maxLineLength?: number;
}

/** Base JSDoc used across tests. */
const documentCommentValue = "*\n * doc\n ";

/**
 * Creates a comment node for the supplied JSDoc value.
 * @param commentValue Input commentValue value.
 * @param sourceText Input sourceText value.
 * @param options Input options value.
 * @returns Comment node for tests.
 * @example
 * ```typescript
 * const comment = createComment("* doc", "function demo() {}", { endLine: 1 });
 * ```
 */
const createComment = (
  commentValue: string,
  sourceText: string,
  options: CommentOptions,
): Comment => ({
  loc: {
    end: { column: 0, line: options.endLine },
    start: {
      column: options.startColumn ?? 0,
      line: options.startLine ?? 1,
    },
  },
  range: [0, sourceText.length],
  type: "Block",
  value: commentValue,
});

/**
 * Creates a rule context with the provided comments.
 * @param comments Input comments value.
 * @param options Input options value.
 * @returns Rule context state for tests.
 * @example
 * ```typescript
 * const state = createContext([]);
 * ```
 */
const createContext = (
  comments: Comment[],
  options?: SingleLineJsdocOptions,
): RuleContextState => {
  const reports: ReportEntry[] = [];
  const sourceCode = {
    getAllComments: (): Comment[] => comments,
  };
  const context: Rule.RuleContext = {
    id: "single-line-jsdoc",
    options: options === void 0 ? [] : [options],
    report: (descriptor: Rule.ReportDescriptor): void => {
      const messageId =
        "messageId" in descriptor ? descriptor.messageId : void 0;
      reports.push({
        fix: descriptor.fix,
        ...(messageId === void 0 ? {} : { messageId }),
      });
    },
    sourceCode,
  } as Rule.RuleContext;

  return { context, reports };
};

describe("single-line-jsdoc rule", () => {
  const sourceText = "function demo() {}";
  const paragraphCommentValue = "*\n * line one\n *\n * line two\n ";
  const tagCommentValue = "*\n * @param foo bar\n ";
  const multiLineCommentValue = "*\n * line one\n * line two\n ";

  it("reports multi-line JSDoc that fits on one line", () => {
    // Arrange
    const comment = createComment(documentCommentValue, sourceText, { endLine: 3 });
    const { context, reports } = createContext([comment]);

    // Act
    const fixText = (singleLineJsdocRule.create(context), String(
      getFixText(reports[0]?.fix?.(createFixer()) ?? void 0),
    ));

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleLine");
    expect(fixText).toBe("/** doc */");
  });

  it.each([
    ["skips single-line JSDoc", "* doc ", 1],
    ["skips JSDoc with tags", tagCommentValue, 3],
    ["skips JSDoc with multiple content lines", multiLineCommentValue, 4],
    ["skips comments with paragraph breaks", paragraphCommentValue, 5],
  ])("%s", (caseLabel, commentValue, endLine): void => {
    void caseLabel;
    const comment = createComment(commentValue, sourceText, { endLine });
    const { context, reports } = createContext([comment]);

    singleLineJsdocRule.create(context);

    expect(reports).toHaveLength(0);
  });

  it("respects max line length", () => {
    // Arrange
    const comment = createComment("*\n * short text\n ", sourceText, { endLine: 3 });
    const { context, reports } = createContext([comment], {
      maxLineLength: 10,
    });

    // Act
    singleLineJsdocRule.create(context);

    // Assert
    expect(reports).toHaveLength(0);
  });
});
