import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import {
  createFixer,
  getFixText,
} from "../__tests__/documentation-test-helpers";
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

/** Type definition for rule data. */
type SourceCodeAdapterOverrides = SourceCodeOverrides &
  SourceCodeTokenAfterOverride;

/** Type definition for rule data. */
interface SourceCodeOverrides {
  /** Optional getNodeByRangeIndex override. */
  getNodeByRangeIndex?: (index: number) => unknown;
}

/** Type definition for rule data. */
interface SourceCodeTokenAfterOverride {
  /** Optional getTokenAfter override. */
  getTokenAfter?: (comment: Comment, options?: TokenAfterOptions) => unknown;
}

/** Type definition for rule data. */
interface TokenAfterOptions {
  /** Whether comment tokens are included. */
  includeComments?: boolean;
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
 * @param sourceCodeOverrides Optional sourceCode adapter overrides.
 * @returns Rule context state for tests.
 * @example
 * ```typescript
 * const state = createContext([]);
 * ```
 */
const createContext = (
  comments: Comment[],
  options?: SingleLineJsdocOptions,
  sourceCodeOverrides?: SourceCodeAdapterOverrides,
): RuleContextState => {
  const reports: ReportEntry[] = [];
  const sourceCode = {
    getAllComments: (): Comment[] => comments,
    ...sourceCodeOverrides,
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
    const comment = createComment(documentCommentValue, sourceText, {
      endLine: 3,
    });
    const { context, reports } = createContext([comment]);

    // Act
    const actualFixText =
      (singleLineJsdocRule.create(context),
      String(getFixText(reports[0]?.fix?.(createFixer()) ?? void 0)));

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleLine");
    expect(actualFixText).toBe("/** doc */");
  });

  it.each([
    ["skips single-line JSDoc", "* doc ", 1],
    ["skips JSDoc with tags", tagCommentValue, 3],
    ["skips JSDoc with multiple content lines", multiLineCommentValue, 4],
    ["skips comments with paragraph breaks", paragraphCommentValue, 5],
  ])("%s", (caseLabel, commentValue, endLine): void => {
    // Arrange
    void caseLabel;
    const comment = createComment(commentValue, sourceText, { endLine });
    const { context, reports } = createContext([comment]);

    // Act
    singleLineJsdocRule.create(context);

    // Assert
    expect(reports).toHaveLength(0);
  });

  it("respects max line length", () => {
    // Arrange
    const comment = createComment("*\n * short text\n ", sourceText, {
      endLine: 3,
    });
    const { context, reports } = createContext([comment], {
      maxLineLength: 10,
    });

    // Act
    singleLineJsdocRule.create(context);

    // Assert
    expect(reports).toHaveLength(0);
  });

  it.each([
    { nodeType: "FunctionDeclaration" },
    { nodeType: "TSDeclareFunction" },
    { nodeType: "TSFunctionType" },
    { nodeType: "MethodDefinition" },
    { nodeType: "TSMethodSignature" },
    { nodeType: "TSCallSignatureDeclaration" },
    { nodeType: "TSConstructSignatureDeclaration" },
    {
      declarations: [{ init: { type: "ArrowFunctionExpression" } }],
      nodeType: "VariableDeclaration",
    },
    { nodeType: "Property", value: { type: "FunctionExpression" } },
    {
      nodeType: "PropertyDefinition",
      value: { type: "ArrowFunctionExpression" },
    },
    {
      declaration: { type: "FunctionDeclaration" },
      nodeType: "ExportDefaultDeclaration",
    },
    {
      declaration: { type: "FunctionDeclaration" },
      nodeType: "ExportNamedDeclaration",
    },
  ])("skips JSDoc for function-like targets: $nodeType", (nodeShape) => {
    // Arrange
    const comment = createComment(documentCommentValue, sourceText, {
      endLine: 3,
    });
    const { context, reports } = createContext([comment], void 0, {
      getNodeByRangeIndex: () => ({
        ...(nodeShape.declarations === void 0
          ? {}
          : { declarations: nodeShape.declarations }),
        ...(nodeShape.declaration === void 0
          ? {}
          : { declaration: nodeShape.declaration }),
        ...(nodeShape.value === void 0 ? {} : { value: nodeShape.value }),
        type: nodeShape.nodeType,
      }),
      getTokenAfter: () => ({ range: [0, 1] }),
    });

    // Act
    singleLineJsdocRule.create(context);

    // Assert
    expect(reports).toHaveLength(0);
  });

  it("reports when token-after lookup cannot provide range", () => {
    // Arrange
    const comment = createComment(documentCommentValue, sourceText, {
      endLine: 3,
    });
    const { context, reports } = createContext([comment], void 0, {
      getNodeByRangeIndex: () => ({ type: "FunctionDeclaration" }),
      getTokenAfter: () => ({}),
    });

    // Act
    singleLineJsdocRule.create(context);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleLine");
  });

  it("reports when getNodeByRangeIndex is not a function", () => {
    // Arrange
    const comment = createComment(documentCommentValue, sourceText, {
      endLine: 3,
    });
    const { context, reports } = createContext([comment], void 0, {
      getTokenAfter: () => ({ range: [0, 1] }),
    });

    // Act
    singleLineJsdocRule.create(context);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleLine");
  });

  it("reports when getTokenAfter is not a function", () => {
    // Arrange
    const comment = createComment(documentCommentValue, sourceText, {
      endLine: 3,
    });
    const { context, reports } = createContext([comment], void 0, {
      getNodeByRangeIndex: () => ({ type: "FunctionDeclaration" }),
    });

    // Act
    singleLineJsdocRule.create(context);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleLine");
  });
});
