import type { Example } from "./types";

import { getFenceLanguage } from "./example-utilities";
import { buildExampleFromParts } from "./examples";

/** Type definition for rule data. */
interface ActiveExampleState {
  /** BodyLines field value. */
  bodyLines: string[];

  /** Header field value. */
  header: string;

  /** InFence field value. */
  inFence: boolean;

  /** StartOffset field value. */
  startOffset: number;
}

/** Type definition for rule data. */
interface CommentLine {
  /** StartOffset field value. */
  startOffset: number;

  /** Text field value. */
  text: string;
}

/**
 * Collects comment lines with their offsets.
 * @param commentValue Raw comment value.
 * @returns Parsed comment lines.
 * @example
 * ```typescript
 * const lines = getCommentLines("* @example\n* value");
 * ```
 */
function getCommentLines(commentValue: string): CommentLine[] {
  const lines: CommentLine[] = [];

  for (const match of commentValue.matchAll(/[^\r\n]*(?:\r?\n|$)/gu)) {
    const value = match[0];

    if (value.length === 0) {
      continue;
    }

    lines.push({
      startOffset: match.index,
      text: value.replace(/\r?\n$/u, ""),
    });
  }

  return lines;
}

/**
 * Extracts all \@example entries from a JSDoc comment value.
 * Uses a fence-aware parser so lines that start with `@` inside
 * fenced blocks remain part of the same example.
 * @param commentValue Raw comment value.
 * @returns Extracted examples.
 * @example
 * ```typescript
 * const examples = getExamples("* @example\n* ```typescript\n* ok\n* ```");
 * ```
 */
function getExamples(commentValue: string): Example[] {
  const commentLines = getCommentLines(commentValue);
  const examples: Example[] = [];
  let activeExample: ActiveExampleState | undefined;

  for (const line of commentLines) {
    if (activeExample === void 0) {
      if (!isExampleHeaderLine(line.text)) {
        continue;
      }

      activeExample = {
        bodyLines: [],
        header: line.text,
        inFence: false,
        startOffset: line.startOffset,
      };
      continue;
    }

    if (!activeExample.inFence && isJSDocumentTagLine(line.text)) {
      examples.push(
        buildExampleFromParts({
          bodyLines: activeExample.bodyLines,
          commentValue,
          endOffset: line.startOffset,
          header: activeExample.header,
          startOffset: activeExample.startOffset,
        }),
      );

      activeExample = isExampleHeaderLine(line.text)
        ? {
            bodyLines: [],
            header: line.text,
            inFence: false,
            startOffset: line.startOffset,
          }
        : void 0;
      continue;
    }

    activeExample.bodyLines.push(line.text);

    if (getFenceLanguage(line.text) !== void 0) {
      activeExample.inFence = !activeExample.inFence;
    }
  }

  if (activeExample !== void 0) {
    examples.push(
      buildExampleFromParts({
        bodyLines: activeExample.bodyLines,
        commentValue,
        endOffset: commentValue.length,
        header: activeExample.header,
        startOffset: activeExample.startOffset,
      }),
    );
  }

  return examples;
}

/**
 * Checks whether a line starts an \@example tag.
 * @param line Line to inspect.
 * @returns True when the line starts an \@example tag.
 * @example
 * ```typescript
 * const isHeader = isExampleHeaderLine(" * @example");
 * ```
 */
function isExampleHeaderLine(line: string): boolean {
  return /^\s*\*?\s*@example\b/u.test(line);
}

/**
 * Checks whether a line starts a JSDoc tag.
 * @param line Line to inspect.
 * @returns True when the line starts a JSDoc tag.
 * @example
 * ```typescript
 * const isTag = isJSDocumentTagLine(" * @returns value");
 * ```
 */
function isJSDocumentTagLine(line: string): boolean {
  return /^\s*\*?\s*@\w+\b/u.test(line);
}

export { getExamples };
