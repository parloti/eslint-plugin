import type { Rule } from "eslint";

/** Type definition for rule data. */
type Comment = ReturnType<
  Rule.RuleContext["sourceCode"]["getAllComments"]
>[number];

/** Type definition for rule data. */
interface DualJsdocContext {
  /** Node field value. */
  node: Rule.Node;

  /** Second field value. */
  second: Comment;

  /** SourceCode field value. */
  sourceCode: Rule.RuleContext["sourceCode"];
}

/** Type definition for rule data. */
interface JsdocLookupContext {
  /** Node field value. */
  node: Rule.Node;

  /** SourceCode field value. */
  sourceCode: Rule.RuleContext["sourceCode"];
}

/** Type definition for rule data. */
interface SingleJsdocContext {
  /** Comment field value. */
  comment: Comment;

  /** Node field value. */
  node: Rule.Node;

  /** SourceCode field value. */
  sourceCode: Rule.RuleContext["sourceCode"];
}

/**
 * Creates a block comment value for tests.
 * @param value Comment value without delimiters.
 * @param range Comment range in the source text.
 * @returns The comment object.
 * @example
 * ```typescript
 * const comment = createComment("*\n * ok\n ", [0, 10]);
 * ```
 */
const createComment = (value: string, range?: [number, number]): Comment =>
  ({
    range,
    type: "Block",
    value,
  }) as Comment;

/**
 * Creates a source code wrapper with comments.
 * @param text Full source text.
 * @param comments Comment nodes to return.
 * @returns SourceCode stub used in tests.
 * @example
 * ```typescript
 * const sourceCode = createSourceCode("function demo() {}", []);
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
 * Creates a function node for the test source text.
 * @param sourceText Source content that includes a function.
 * @returns Function declaration node used in tests.
 * @example
 * ```typescript
 * const node = createFunctionNode("function demo() {}");
 * ```
 */
const createFunctionNode = (sourceText: string): Rule.Node =>
  ({
    range: [sourceText.indexOf("function"), sourceText.length],
    type: "FunctionDeclaration",
  }) as Rule.Node;

/**
 * Creates a context with two JSDoc comments.
 * @returns The dual-comment context.
 * @example
 * ```typescript
 * const context = createDualJsdocContext();
 * ```
 */
const createDualJsdocContext = (): DualJsdocContext => {
  const sourceText = [
    "/**\n * first\n */",
    "/**\n * second\n */",
    "function demo() {}",
  ].join("\n");
  const firstStart = sourceText.indexOf("/**");
  const firstEnd = sourceText.indexOf("*/") + 2;
  const secondStart = sourceText.indexOf("/**", firstEnd);
  const secondEnd = sourceText.indexOf("*/", secondStart) + 2;
  const first = createComment("*\n * first\n ", [firstStart, firstEnd]);
  const second = createComment("*\n * second\n ", [secondStart, secondEnd]);

  return {
    node: createFunctionNode(sourceText),
    second,
    sourceCode: createSourceCode(sourceText, [first, second]),
  };
};

/**
 * Creates a context with a single JSDoc comment.
 * @returns The single-comment context.
 * @example
 * ```typescript
 * const context = createSingleJsdocContext();
 * ```
 */
const createSingleJsdocContext = (): SingleJsdocContext => {
  const sourceText = ["/**\n * ok\n */", "function demo() {}"].join("\n");
  const comment = createComment("*\n * ok\n ", [
    0,
    sourceText.indexOf("*/") + 2,
  ]);

  return {
    comment,
    node: createFunctionNode(sourceText),
    sourceCode: createSourceCode(sourceText, [comment]),
  };
};

/**
 * Creates a context with a non-JSDoc comment.
 * @returns The lookup context.
 * @example
 * ```typescript
 * const context = createNonJsdocContext();
 * ```
 */
const createNonJsdocContext = (): JsdocLookupContext => {
  const sourceText = "// line\nfunction demo() {}";
  const comment = {
    range: [0, 7],
    type: "Line",
    value: " line",
  } as Comment;

  return {
    node: createFunctionNode(sourceText),
    sourceCode: createSourceCode(sourceText, [comment]),
  };
};

/**
 * Creates a context with a JSDoc comment missing range data.
 * @returns The lookup context.
 * @example
 * ```typescript
 * const context = createRangeMissingContext();
 * ```
 */
const createRangeMissingContext = (): JsdocLookupContext => {
  const sourceText = "function demo() {}";
  const comment = {
    type: "Block",
    value: "*\n * ok\n ",
  } as Comment;

  return {
    node: createFunctionNode(sourceText),
    sourceCode: createSourceCode(sourceText, [comment]),
  };
};

export {
  createComment,
  createDualJsdocContext,
  createNonJsdocContext,
  createRangeMissingContext,
  createSingleJsdocContext,
  createSourceCode,
};
export type { Comment };
