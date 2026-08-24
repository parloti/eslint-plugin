import type { Rule } from "eslint";

import type { Comment } from "./types";

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

  if (typeof nodeStart !== "number" || comments.length === 0) {
    return void 0;
  }

  const comment = findClosestComment(comments, nodeStart);

  if (comment === void 0) {
    return void 0;
  }

  const commentEnd = comment.range?.[1];

  if (typeof commentEnd !== "number") {
    return void 0;
  }

  const betweenCommentAndNode = sourceCode.text.slice(commentEnd, nodeStart);

  return betweenCommentAndNode.trim().length === 0 ? comment : void 0;
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

export { getCommentText, getJsdocComment };
