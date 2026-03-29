import type { Rule } from "eslint";

import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

import { singleLineJsdocRuleNodeLookups } from "./rule.node-lookups";

/** Type definition for rule data. */
type Comment = ReturnType<Rule.RuleContext["sourceCode"]["getAllComments"]>[number];

/** Type definition for comment options. */
interface CommentOptions {
  /** End line used by the synthetic comment. */
  endLine: number;
  /** Start line override. */
  startLine?: number;
}

/** Type definition for rule data. */
interface ReportEntry {
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

/** Type definition for the token data used in tests. */
interface TokenAfter {
  /** Token range for lookup. */
  range?: [number, number];
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
    start: { column: 0, line: options.startLine ?? 1 },
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
      reports.push(messageId === void 0 ? {} : { messageId });
    },
    settings: {},
    sourceCode,
  } as unknown as Rule.RuleContext;

  return { context, reports };
};

/**
 * Runs the rule with optional source lookup overrides.
 * @param comment Comment node to analyze.
 * @param overrides Optional source-code overrides.
 * @returns Reports emitted by the rule.
 * @example
 * ```typescript
 * const reports = runRuleWithOverrides({} as Comment);
 * void reports;
 * ```
 */
const runRuleWithOverrides = (
  comment: Comment,
  overrides?: Record<string, unknown>,
): ReportEntry[] => {
  const state = createContext([comment], overrides);
  singleLineJsdocRuleNodeLookups.create(state.context);
  return state.reports;
};

/**
 * Runs the rule for a supplied comment set.
 * @param comments Comments exposed by the synthetic source code.
 * @param overrides Optional source-code overrides.
 * @returns Reports emitted by the rule.
 * @example
 * ```typescript
 * const reports = runRuleForComments([]);
 * void reports;
 * ```
 */
const runRuleForComments = (
  comments: Comment[],
  overrides?: Record<string, unknown>,
): ReportEntry[] => {
  const state = createContext(comments, overrides);
  singleLineJsdocRuleNodeLookups.create(state.context);
  return state.reports;
};

/**
 * Collects report results for the lookup-failure permutations.
 * @param comment Comment node to analyze.
 * @param tokenAfterRange Token range used by lookup helpers.
 * @returns Report lists for each lookup permutation.
 * @example
 * ```typescript
 * const reports = collectLookupFailureReports({} as Comment, { range: [0, 1] });
 * void reports;
 * ```
 */
const collectLookupFailureReports = (
  comment: Comment,
  tokenAfterRange: TokenAfter,
): ReportEntry[][] => [
  runRuleWithOverrides(comment),
  runRuleWithOverrides(comment, {
    getNodeByRangeIndex: () => ({ type: "Literal" }),
  }),
  runRuleWithOverrides(comment, {
    getNodeByRangeIndex: () => ({ type: "Literal" }),
    getTokenAfter: (): TokenAfter => ({}),
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

describe("single-line-jsdoc rule lookup edge cases", () => {
  const sourceText = "function demo() {}";

  it("skips JSDoc for function-like nodes", () => {
    // Arrange
    const nodes = [
      { type: "FunctionDeclaration" },
      { type: "ArrowFunctionExpression" },
      { type: "MethodDefinition" },
      { type: "TSMethodSignature" },
      { type: "TSCallSignatureDeclaration" },
      { type: "TSConstructSignatureDeclaration" },
      { type: "TSFunctionType" },
      { type: "Property", value: { type: "FunctionExpression" } },
      {
        type: "PropertyDefinition",
        value: { type: "ArrowFunctionExpression" },
      },
      {
        declarations: [{ init: { type: "FunctionExpression" } }],
        type: "VariableDeclaration",
      },
      {
        declaration: { type: "FunctionDeclaration" },
        type: "ExportNamedDeclaration",
      },
      {
        declaration: { type: "FunctionDeclaration" },
        type: "ExportDefaultDeclaration",
      },
    ];
    const comments: Comment[] = [];

    for (const [index] of nodes.entries()) {
      comments.push(
        createComment(documentCommentValue, sourceText, {
          endLine: index + 2,
          startLine: index + 1,
        }),
      );
    }

    const getTokenAfter = (comment: Comment): TokenAfter | undefined => {
      const index = comments.indexOf(comment);

      return index === -1 ? void 0 : { range: [index, index + 1] };
    };
    const getNodeByRangeIndex = (index: number): unknown =>
      nodes[index] ?? void 0;
    const overrides = {
      getNodeByRangeIndex,
      getTokenAfter,
    };

    // Act
    const reports = runRuleForComments(comments, overrides);

    // Assert
    expect(reports).toHaveLength(0);
  });

  it("reports when lookups fail", () => {
    // Arrange
    const comment = createComment(documentCommentValue, sourceText, {
      endLine: 2,
    });
    const tokenAfterRange: TokenAfter = { range: [0, 1] };

    // Act
    const reportsList = collectLookupFailureReports(comment, tokenAfterRange);

    // Assert
    for (const reports of reportsList) {
      expect(reports).toHaveLength(1);
    }
  });
});