import type { Rule } from "eslint";

import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

import { singleLineJsdocRule } from "./rule";
import { singleLineJsdocRuleEdgeCases } from "./rule.edge-cases";

/** Type definition for rule data. */
type Comment = ReturnType<Rule.RuleContext["sourceCode"]["getAllComments"]>[number];

/** Type definition for comment options. */
interface CommentOptions {
  /** End line used by the synthetic comment. */
  endLine: number;
  /** Start column override. */
  startColumn?: number;
  /** Start line override. */
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

/** Base JSDoc used across tests. */
const documentCommentValue = "*\n * doc\n ";

/**
 * Creates a synthetic JSDoc comment node.
 * @param commentValue Input comment value.
 * @param sourceText Input source text.
 * @param options Synthetic comment location options.
 * @returns Synthetic comment node.
 * @example
 * ```typescript
 * const comment = createComment("* doc", "function demo() {}", { endLine: 1 });
 * void comment;
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
 * Creates a synthetic rule context and captures emitted reports.
 * @param comments Comments exposed by the synthetic source code.
 * @param sourceCodeOverrides Optional source-code overrides.
 * @returns Synthetic context state for tests.
 * @example
 * ```typescript
 * const state = createContext([]);
 * void state;
 * ```
 */
const createContext = (
  comments: Comment[],
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
  const filename = "example.ts";
  const context = {
    cwd: cwd(),
    filename,
    getFilename: (): string => filename,
    getPhysicalFilename: (): string => filename,
    getSourceCode: (): typeof sourceCode => sourceCode,
    id: "single-line-jsdoc",
    languageOptions: {
      ecmaVersion: "latest" as const,
      sourceType: "module" as const,
    },
    options: [],
    physicalFilename: filename,
    report: (descriptor: Rule.ReportDescriptor): void => {
      const messageId =
        "messageId" in descriptor ? descriptor.messageId : void 0;
      reports.push({
        fix: descriptor.fix,
        ...(messageId === void 0 ? {} : { messageId }),
      });
    },
    settings: {},
    sourceCode,
  } as unknown as Rule.RuleContext;

  return { context, reports };
};

describe("single-line-jsdoc rule edge cases", () => {
  const sourceText = "function demo() {}";

  it("exports the edge-case companion module", () => {
    // Arrange

    // Act
    const actual = singleLineJsdocRuleEdgeCases;

    // Assert
    expect(actual).toBe(singleLineJsdocRule);
  });

  it("falls back to default when max line length is non-positive", () => {
    // Arrange
    const comment = createComment(documentCommentValue, sourceText, { endLine: 3 });
    const { context, reports } = createContext([comment], {
      getAllComments: (): Comment[] => [comment],
    });
    context.options = [{ maxLineLength: 0 }];

    // Act
    singleLineJsdocRule.create(context);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleLine");
  });

  it("skips empty JSDoc content", () => {
    // Arrange
    const comment = createComment("*\n *\n ", sourceText, { endLine: 3 });
    const { context, reports } = createContext([comment]);

    // Act
    singleLineJsdocRule.create(context);

    // Assert
    expect(reports).toHaveLength(0);
  });

  it("skips non-jsdoc comments", () => {
    // Arrange
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

    // Act
    singleLineJsdocRule.create(context);

    // Assert
    expect(reports).toHaveLength(0);
  });

  it("skips comments without loc", () => {
    // Arrange
    const comment: Comment = {
      loc: void 0,
      range: [0, 0],
      type: "Block",
      value: "*\n * doc\n ",
    } as Comment;
    const { context, reports } = createContext([comment]);

    // Act
    singleLineJsdocRule.create(context);

    // Assert
    expect(reports).toHaveLength(0);
  });

  it("skips comments without range", () => {
    // Arrange
    const comment = {
      ...createComment(documentCommentValue, sourceText, { endLine: 3 }),
      range: void 0,
    } as Comment;
    const { context, reports } = createContext([comment]);

    // Act
    singleLineJsdocRule.create(context);

    // Assert
    expect(reports).toHaveLength(0);
  });

});