import type { Rule } from "eslint";

/** Type definition for rule data. */
type Comment = ReturnType<
  Rule.RuleContext["sourceCode"]["getAllComments"]
>[number];

/**
 * Defines stripJsdocLine.
 * @param line Input line value.
 * @returns Return value output.
 * @example
 * ```typescript
 * stripJsdocLine();
 * ```
 */
const stripJsdocLine = (line: string): string =>
  line.replace(/^\s*\*? ?/u, "").trimEnd();

/**
 * Defines trimEmptyEdges.
 * @param lines Input lines value.
 * @returns Return value output.
 * @example
 * ```typescript
 * trimEmptyEdges();
 * ```
 */
const trimEmptyEdges = (lines: string[]): string[] => {
  let start = 0;
  let end = lines.length - 1;

  while (start <= end && lines[start]?.length === 0) {
    start += 1;
  }

  while (end >= start && lines[end]?.length === 0) {
    end -= 1;
  }

  return lines.slice(start, end + 1);
};

/**
 * Gets getContentLines.
 * @param commentValue Input commentValue value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getContentLines();
 * ```
 */
const getContentLines = (commentValue: string): string[] => {
  const lines = commentValue
    .split(/\r?\n/u)
    .map((line) => stripJsdocLine(line))
    .map((line) => line.trim());

  return trimEmptyEdges(lines);
};

/**
 * Checks shouldSkipContent.
 * @param lines Input lines value.
 * @returns Return value output.
 * @example
 * ```typescript
 * shouldSkipContent();
 * ```
 */
const shouldSkipContent = (lines: string[]): boolean => {
  if (lines.length === 0) {
    return true;
  }

  if (lines.some((line) => line.length === 0)) {
    return true;
  }

  return lines.some((line) => line.startsWith("@"));
};

/**
 * Defines collapseContent.
 * @param lines Input lines value.
 * @returns Return value output.
 * @example
 * ```typescript
 * collapseContent();
 * ```
 */
const collapseContent = (lines: string[]): string =>
  lines.join(" ").replaceAll(/\s+/gu, " ").trim();

/**
 * Gets getCollapsedContent.
 * @param comment Input comment value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getCollapsedContent();
 * ```
 */
const getCollapsedContent = (comment: Comment): string | undefined => {
  const contentLines = getContentLines(comment.value);

  if (shouldSkipContent(contentLines)) {
    return void 0;
  }

  if (contentLines.length !== 1) {
    return void 0;
  }

  return collapseContent(contentLines);
};

export { getCollapsedContent };
export type { Comment };
