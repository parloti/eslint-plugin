import type { Rule } from "eslint";

import { noInterfaceMemberDocumentationRule } from "./rule";

/** Type definition for rule data. */
type Comment = ReturnType<
  Rule.RuleContext["sourceCode"]["getAllComments"]
>[number];

/** Type definition for rule data. */
interface InterfaceSample {
  /** Context field value. */
  context: Rule.RuleContext;

  /** Node field value. */
  node: Rule.Node;

  /** Reports field value. */
  reports: ReportEntry[];

  /** SourceText field value. */
  sourceText: string;
}

/** Type definition for rule data. */
interface ReportDescriptorDetails {
  /** Fix field value. */
  fix?: null | Rule.ReportFixer | undefined;

  /** MessageId field value. */
  messageId?: string;
}

/** Type definition for rule data. */
interface ReportEntry {
  /** Fix helper value. */
  fix?: null | Rule.ReportFixer | undefined;

  /** MessageId helper value. */
  messageId: string | undefined;
}

/** Type definition for rule data. */
interface RuleContextState {
  /** Context field value. */
  context: Rule.RuleContext;

  /** Reports field value. */
  reports: ReportEntry[];
}

/**
 * Creates a SourceCode stub with the provided comments.
 * @param text Source text to attach.
 * @param comments Comment nodes to expose.
 * @returns SourceCode stub for tests.
 * @example
 * ```typescript
 * const sourceCode = createSourceCode("", []);
 * ```
 */
const createSourceCode = (
  text: string,
  comments: Comment[],
): Rule.RuleContext["sourceCode"] =>
  ({
    getAllComments: (): Comment[] => comments,
    text,
  }) as Rule.RuleContext["sourceCode"];

/**
 * Builds a rule context for collecting reports.
 * @param sourceCode SourceCode stub.
 * @param reports Report sink.
 * @returns Rule context that records reports.
 * @example
 * ```typescript
 * const context = buildRuleContext(sourceCode, reports);
 * ```
 */
const buildRuleContext = (
  sourceCode: Rule.RuleContext["sourceCode"],
  reports: ReportEntry[],
): Rule.RuleContext =>
  ({
    id: "no-interface-member-docs",
    options: [],
    report: (descriptor: Rule.ReportDescriptor): void => {
      const { fix, messageId } = descriptor as ReportDescriptorDetails;
      const entry: ReportEntry = { fix, messageId };

      reports.push(entry);
    },
    sourceCode,
  }) as unknown as Rule.RuleContext;

/**
 * Creates a rule context state for the given source text.
 * @param sourceText Source text to analyze.
 * @param comments Comment nodes for the source.
 * @returns Context state for tests.
 * @example
 * ```typescript
 * const state = createContext("", []);
 * ```
 */
const createContext = (
  sourceText: string,
  comments: Comment[],
): RuleContextState => {
  const reports: ReportEntry[] = [];
  const sourceCode = createSourceCode(sourceText, comments);

  return { context: buildRuleContext(sourceCode, reports), reports };
};

/**
 * Creates a JSDoc block comment for the given source text.
 * @param commentValue Comment value without delimiters.
 * @param sourceText Source text containing the comment.
 * @returns Comment node for the source text.
 * @example
 * ```typescript
 * const comment = createComment("*\n * ok\n ", "function demo() {}");
 * ```
 */
const createComment = (commentValue: string, sourceText: string): Comment => {
  const end = sourceText.indexOf("*/") + 2;

  return {
    range: [0, end],
    type: "Block",
    value: commentValue,
  } as Comment;
};

/**
 * Creates a function node for the given source text.
 * @param sourceText Source text containing the function.
 * @param parameters Parameter nodes for the function.
 * @returns Function declaration node.
 * @example
 * ```typescript
 * const node = createFunctionNode("function demo() {}", []);
 * ```
 */
const createFunctionNode = (
  sourceText: string,
  parameters: unknown[],
): Rule.Node =>
  ({
    params: parameters,
    range: [sourceText.indexOf("function"), sourceText.length],
    type: "FunctionDeclaration",
  }) as Rule.Node;

/**
 * Creates a parameter node with a type annotation.
 * @param type Type annotation kind to assign.
 * @returns Parameter node for tests.
 * @example
 * ```typescript
 * const param = createParameter("TSTypeReference");
 * ```
 */
const createParameter = (type: string): unknown => ({
  name: "context",
  type: "Identifier",
  typeAnnotation: {
    typeAnnotation: { type },
  },
});

/**
 * Runs the rule listener for a function declaration node.
 * @param context Rule execution context.
 * @param node Function node to inspect.
 * @example
 * ```typescript
 * runFunctionListener(context, node);
 * ```
 */
const runFunctionListener = (
  context: Rule.RuleContext,
  node: Rule.Node,
): void => {
  const listeners = noInterfaceMemberDocumentationRule.create(context);
  const listener = listeners.FunctionDeclaration as
    | ((node: Rule.Node) => void)
    | undefined;

  listener?.(node);
};

/**
 * Builds source text with a leading JSDoc comment.
 * @param commentValue Comment value used in the source.
 * @returns Source text containing the comment and function.
 * @example
 * ```typescript
 * const text = buildSourceText("*\n * ok\n ");
 * ```
 */
const buildSourceText = (commentValue: string): string =>
  [
    "/**",
    commentValue.trimEnd(),
    "*/",
    "function getLineMeta(context: LineMetaContext): void {}",
  ].join("\n");

/**
 * Creates a sample test fixture for interface member docs.
 * @returns Sample context, node, and reports.
 * @example
 * ```typescript
 * const sample = createInterfaceSample();
 * ```
 */
const createInterfaceSample = (): InterfaceSample => {
  const commentValue = [
    "*",
    " * Compute line metadata from the raw comment value.",
    " * @param context The metadata context.",
    " * @param context.commentValue The full comment value.",
    " * @param context.full The full matched example text.",
    " * @param context.startOffset The match start offset.",
    " * @returns The line metadata for the example.",
    " ",
  ].join("\n");
  const sourceText = buildSourceText(commentValue);
  const comment = createComment(commentValue, sourceText);
  const { context, reports } = createContext(sourceText, [comment]);
  const node = createFunctionNode(sourceText, [
    createParameter("TSTypeReference"),
  ]);

  return { context, node, reports, sourceText };
};

export {
  buildSourceText,
  createComment,
  createContext,
  createFunctionNode,
  createInterfaceSample,
  createParameter,
  runFunctionListener,
};
export type { Comment };
