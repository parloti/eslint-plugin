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
/** Type definition for the token data used in tests. */
interface TokenAfter {
  /** Token range for lookup. */
  range: [number, number];
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
 * @param sourceCodeOverrides Optional sourceCode overrides for tests.
 * @returns Rule context state for tests.
 * @example
 * ```typescript
 * const state = createContext([]);
 * ```
 */
const createContext = (
  comments: Comment[],
  options?: SingleLineJsdocOptions,
  sourceCodeOverrides?: Record<string, unknown>,
): RuleContextState => {
  const reports: ReportEntry[] = [];
  const baseSourceCode = {
    getAllComments: (): Comment[] => comments,
  };
  const sourceCode =
    sourceCodeOverrides === void 0
      ? baseSourceCode
      : { ...baseSourceCode, ...sourceCodeOverrides };
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

/**
 * Runs the rule for a single comment with optional source overrides.
 * @param comment Comment node to analyze.
 * @param overrides Optional SourceCode overrides.
 * @returns Reports produced by the rule.
 * @example
 * ```typescript
 * runRuleWithOverrides({} as Comment);
 * ```
 */
const runRuleWithOverrides = (
  comment: Comment,
  overrides?: Record<string, unknown>,
): ReportEntry[] => {
  const state = createContext([comment], void 0, overrides);
  singleLineJsdocRule.create(state.context);
  return state.reports;
};

describe("single-line-jsdoc rule", () => {
  const sourceText = "function demo() {}";
  const paragraphCommentValue = "*\n * line one\n *\n * line two\n ";
  const tagCommentValue = "*\n * @param foo bar\n ";
  const multiLineCommentValue = "*\n * line one\n * line two\n ";

  it("reports multi-line JSDoc that fits on one line", () => {
    const comment = createComment(documentCommentValue, sourceText, { endLine: 3 });
    const { context, reports } = createContext([comment]);
    singleLineJsdocRule.create(context);
    const fixText = getFixText(reports[0]?.fix?.(createFixer()) ?? void 0);

    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleLine");
    expect(String(fixText)).toBe("/** doc */");
  });

  it.each([
    ["skips single-line JSDoc", "* doc ", 1],
    ["skips JSDoc with tags", tagCommentValue, 3],
    ["skips JSDoc with multiple content lines", multiLineCommentValue, 4],
    ["skips comments with paragraph breaks", paragraphCommentValue, 5],
  ])("%s", (caseLabel, commentValue, endLine) => {
    void caseLabel;
    const comment = createComment(commentValue, sourceText, { endLine });
    const { context, reports } = createContext([comment]);
    singleLineJsdocRule.create(context);

    expect(reports).toHaveLength(0);
  });

  it("respects max line length", () => {
    const comment = createComment("*\n * short text\n ", sourceText, { endLine: 3 });
    const { context, reports } = createContext([comment], {
      maxLineLength: 10,
    });
    singleLineJsdocRule.create(context);

    expect(reports).toHaveLength(0);
  });
});

describe("single-line-jsdoc rule edge cases", () => {
  const sourceText = "function demo() {}";

  it("falls back to default when max line length is non-positive", () => {
    const comment = createComment(documentCommentValue, sourceText, { endLine: 3 });
    const { context, reports } = createContext([comment], {
      maxLineLength: 0,
    });
    singleLineJsdocRule.create(context);

    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleLine");
  });

  it("skips empty JSDoc content", () => {
    const comment = createComment("*\n *\n ", sourceText, { endLine: 3 });
    const { context, reports } = createContext([comment]);
    singleLineJsdocRule.create(context);

    expect(reports).toHaveLength(0);
  });

  it("skips non-jsdoc comments", () => {
    const comment: Comment = {
      loc: {
        end: { column: 0, line: 1 },
        start: { column: 0, line: 1 },
      },
      range: [0, 0],
      type: "Line",
      value: " doc",
    } as Comment;
    const { context, reports } = createContext([comment]);
    singleLineJsdocRule.create(context);

    expect(reports).toHaveLength(0);
  });

  it("skips comments without loc", () => {
    const comment: Comment = {
      loc: void 0,
      range: [0, 0],
      type: "Block",
      value: "*\n * doc\n ",
    } as Comment;
    const { context, reports } = createContext([comment]);
    singleLineJsdocRule.create(context);

    expect(reports).toHaveLength(0);
  });

  it("skips comments without range", () => {
    const comment = {
      ...createComment(documentCommentValue, sourceText, { endLine: 3 }),
      range: void 0,
    } as Comment;
    const { context, reports } = createContext([comment]);
    singleLineJsdocRule.create(context);

    expect(reports).toHaveLength(0);
  });

  it("skips JSDoc for function-like nodes", () => {
    const nodes = [
      { type: "FunctionDeclaration" },
      { type: "ArrowFunctionExpression" },
      { type: "MethodDefinition" },
      { type: "TSMethodSignature" },
      { type: "TSCallSignatureDeclaration" },
      { type: "TSConstructSignatureDeclaration" },
      { type: "TSFunctionType" },
      { type: "Property", value: { type: "FunctionExpression" } },
      { type: "PropertyDefinition", value: { type: "ArrowFunctionExpression" } },
      { declarations: [{ init: { type: "FunctionExpression" } }], type: "VariableDeclaration" },
      { declaration: { type: "FunctionDeclaration" }, type: "ExportNamedDeclaration" },
      { declaration: { type: "FunctionDeclaration" }, type: "ExportDefaultDeclaration" },
    ];
    const comments = nodes.map((nodeValue, index) => {
      void nodeValue;
      return createComment(documentCommentValue, sourceText, { endLine: index + 2, startLine: index + 1 });
    });
    const getTokenAfter = (comment: Comment): TokenAfter | undefined => {
      const index = comments.indexOf(comment);
      return index === -1 ? void 0 : { range: [index, index + 1] };
    };
    const getNodeByRangeIndex = (index: number): unknown => (nodes[index] ?? void 0);
    const { context, reports } = createContext(comments, void 0, {
      getNodeByRangeIndex,
      getTokenAfter,
    });
    singleLineJsdocRule.create(context);

    expect(reports).toHaveLength(0);
  });

  it("reports when lookups fail", () => {
    const comment = createComment(documentCommentValue, sourceText, { endLine: 2 });
    const tokenAfterRange: TokenAfter = { range: [0, 1] };
    const reportsList = [
      runRuleWithOverrides(comment),
      runRuleWithOverrides(comment, { getNodeByRangeIndex: () => ({ type: "Literal" }) }),
      runRuleWithOverrides(comment, {
        getNodeByRangeIndex: () => ({ type: "Literal" }),
        getTokenAfter: (): TokenAfter => ({} as TokenAfter),
      }),
      runRuleWithOverrides(comment, {
        getNodeByRangeIndex: () => ({ type: "Literal" }),
        getTokenAfter: (): TokenAfter => tokenAfterRange,
      }),
      runRuleWithOverrides(comment, {
        getNodeByRangeIndex: () => ({ type: "VariableDeclaration" }),
        getTokenAfter: (): TokenAfter => tokenAfterRange,
      }),
      runRuleWithOverrides(comment, {
        getNodeByRangeIndex: () => void 0,
        getTokenAfter: (): TokenAfter => tokenAfterRange,
      }),
    ];
    for (const reports of reportsList) {
      expect(reports).toHaveLength(1);
    }
  });
});
