import type { CommentLine } from "./types";

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

    results.push({ end: lineEnd, lineBreakLength, start: offset, text: line });

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
    const isPreviousLineBreak = previousChar === "\n";

    if (isPreviousLineBreak) {
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

export { buildRemovalRange, getCommentLines };
