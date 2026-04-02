import type { Rule } from "eslint";

import type { Comment, CommentLine } from "./types";

/**
 * Checks isJsdocComment.
 * @param comment Input comment value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isJsdocComment();
 * ```
 */
const isJsdocComment = (comment: Comment): boolean =>
  comment.type === "Block" && comment.value.startsWith("*");

/**
 * Gets getCommentEnd.
 * @param comment Input comment value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getCommentEnd();
 * ```
 */
const getCommentEnd = (comment: Comment): number | undefined => {
  const commentEnd = comment.range?.[1];

  return typeof commentEnd === "number" ? commentEnd : void 0;
};

/**
 * Finds the closest JSDoc comment before a node.
 * @param comments Comment list to search.
 * @param nodeStart Start offset of the node.
 * @returns The closest JSDoc comment when present.
 * @example
 * ```typescript
 * const comment = findClosestComment(comments, nodeStart);
 * ```
 */
const findClosestComment = (
  comments: Comment[],
  nodeStart: number,
): Comment | undefined => {
  let closest: Comment | undefined = void 0;
  let closestEnd = -1;

  for (const comment of comments) {
    const commentEnd = getCommentEnd(comment);
    const shouldConsider = isJsdocComment(comment) && commentEnd !== void 0;

    if (shouldConsider && commentEnd <= nodeStart && commentEnd > closestEnd) {
      closest = comment;
      closestEnd = commentEnd;
    }
  }

  return closest;
};

/**
 * Gets the closest JSDoc comment for a node.
 * @param sourceCode Source code wrapper.
 * @param node Node to inspect.
 * @returns The closest JSDoc comment when present.
 * @example
 * ```typescript
 * const comment = getJsdocComment(sourceCode, node);
 * ```
 */
const getJsdocComment = (
  sourceCode: Rule.RuleContext["sourceCode"],
  node: Rule.Node,
): Comment | undefined => {
  const comments = sourceCode.getAllComments();
  const nodeStart = node.range?.[0];

  if (comments.length === 0 || typeof nodeStart !== "number") {
    return void 0;
  }

  return findClosestComment(comments, nodeStart);
};

/**
 * Extracts the full text for a comment range.
 * @param sourceCode Source code wrapper.
 * @param comment Comment to read.
 * @returns Comment contents from the source.
 * @example
 * ```typescript
 * const text = getCommentText(sourceCode, comment);
 * ```
 */
const getCommentText = (
  sourceCode: Rule.RuleContext["sourceCode"],
  comment: Comment,
): string => {
  const start = comment.range?.[0];
  const end = comment.range?.[1];

  if (typeof start !== "number" || typeof end !== "number") {
    return "";
  }

  return sourceCode.text.slice(start, end);
};

/**
 * Gets getCommentLines.
 * @param commentText Input commentText value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getCommentLines();
 * ```
 */
const getCommentLines = (commentText: string): CommentLine[] => {
  const lines = commentText.split(/\r?\n/u);
  const results: CommentLine[] = [];
  let offset = 0;

  for (const line of lines) {
    const lineEnd = offset + line.length;
    const nextSlice = commentText.slice(lineEnd, lineEnd + 2);
    const lineBreakLength = nextSlice.startsWith("\r\n")
      ? 2
      : nextSlice.startsWith("\n")
        ? 1
        : 0;

    results.push({
      end: lineEnd,
      lineBreakLength,
      start: offset,
      text: line,
    });

    offset = lineEnd + lineBreakLength;
  }

  return results;
};

/**
 * Builds a removal range for the specified comment line.
 * @param commentStart Comment start offset in the source.
 * @param commentText Full comment text.
 * @param line Line metadata for the comment.
 * @returns The range to remove.
 * @example
 * ```typescript
 * const range = buildRemovalRange(0, commentText, line);
 * ```
 */
const buildRemovalRange = (
  commentStart: number,
  commentText: string,
  line: CommentLine,
): [number, number] => {
  if (line.lineBreakLength > 0) {
    return [
      commentStart + line.start,
      commentStart + line.end + line.lineBreakLength,
    ];
  }

  if (line.start > 0) {
    const previousChar = commentText[line.start - 1];
    const previousIsLineBreak = previousChar === "\n";

    if (previousIsLineBreak) {
      const lineBreakLength =
        line.start > 1 && commentText[line.start - 2] === "\r" ? 2 : 1;
      return [
        commentStart + line.start - lineBreakLength,
        commentStart + line.end,
      ];
    }
  }

  return [commentStart + line.start, commentStart + line.end];
};

export { buildRemovalRange, getCommentLines, getCommentText, getJsdocComment };
