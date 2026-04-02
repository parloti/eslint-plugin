import type { Rule } from "eslint";

import type { Comment } from "./single-line-jsdoc-content";

import { getCollapsedContent } from "./single-line-jsdoc-content";

/** Default value used by this module. */
const DEFAULT_MAX_LINE_LENGTH = 80;

/** Type definition for rule data. */
interface SingleLineJsdocOptions {
  /** MaxLineLength helper value. */
  maxLineLength?: number;
}

/**
 * Normalizes normalizeMaxLineLength.
 * @param options Input options value.
 * @returns Return value output.
 * @example
 * ```typescript
 * normalizeMaxLineLength();
 * ```
 */
const normalizeMaxLineLength = (options: readonly unknown[]): number => {
  const rawOptions = options[0] as SingleLineJsdocOptions | undefined;
  const maxLineLength = rawOptions?.maxLineLength;

  if (typeof maxLineLength === "number" && Number.isFinite(maxLineLength)) {
    const normalized = Math.floor(maxLineLength);
    return normalized > 0 ? normalized : DEFAULT_MAX_LINE_LENGTH;
  }

  return DEFAULT_MAX_LINE_LENGTH;
};

/**
 * Checks isMultilineComment.
 * @param comment Input comment value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isMultilineComment();
 * ```
 */
const isMultilineComment = (comment: Comment): boolean => {
  const { loc, value } = comment;

  if (loc === null || loc === void 0) {
    return /\r|\n/u.test(value);
  }

  return loc.start.line !== loc.end.line;
};

/**
 * Build a single-line JSDoc string from content.
 * @param content Input content value.
 * @returns Return value output.
 * @example
 * ```typescript
 * const text = buildSingleLineText("ok");
 * ```
 */
const buildSingleLineText = (content: string): string => `/** ${content} */`;

/**
 * Creates a fixer for replacing a JSDoc range.
 * @param range Input range value.
 * @param replacementText Input replacementText value.
 * @returns Fixer function for ESLint.
 * @example
 * ```typescript
 * const fixer = createFix([0, 1], "/** ok *\\/");
 * ```
 */
const createFix = (
  range: [number, number],
  replacementText: string,
): Rule.ReportFixer => {
  return (fixer: Rule.RuleFixer): Rule.Fix =>
    fixer.replaceTextRange(range, replacementText);
};

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
 * Gets getStartColumn.
 * @param comment Input comment value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getStartColumn();
 * ```
 */
const getStartColumn = (comment: Comment): number | undefined => {
  const { loc } = comment;

  if (loc === null || loc === void 0) {
    return void 0;
  }

  return loc.start.column;
};

/**
 * Builds a single-line replacement when it fits.
 * @param comment Input comment value.
 * @param maxLineLength Input maxLineLength value.
 * @returns Replacement text when available.
 * @example
 * ```typescript
 * const text = getSingleLineReplacement(comment, 80);
 * ```
 */
const getSingleLineReplacement = (
  comment: Comment,
  maxLineLength: number,
): string | undefined => {
  if (!isMultilineComment(comment)) {
    return void 0;
  }

  const content = getCollapsedContent(comment);
  const startColumn = getStartColumn(comment);

  if (content === void 0 || startColumn === void 0) {
    return void 0;
  }

  const singleLineText = buildSingleLineText(content);

  return startColumn + singleLineText.length > maxLineLength
    ? void 0
    : singleLineText;
};

/**
 * Reports a comment when it can be collapsed to a single line.
 * @param context Input context value.
 * @param comment Input comment value.
 * @param maxLineLength Input maxLineLength value.
 * @example
 * ```typescript
 * reportIfSingleLine(context, comment, 80);
 * ```
 */
const reportIfSingleLine = (
  context: Rule.RuleContext,
  comment: Comment,
  maxLineLength: number,
): void => {
  if (!isJsdocComment(comment)) {
    return;
  }

  const singleLineText = getSingleLineReplacement(comment, maxLineLength);

  if (singleLineText === void 0) {
    return;
  }

  const { loc, range } = comment;

  if (loc === null || loc === void 0 || range === void 0) {
    return;
  }

  context.report({
    fix: createFix(range, singleLineText),
    loc,
    messageId: "singleLine",
  });
};

export { normalizeMaxLineLength, reportIfSingleLine };
