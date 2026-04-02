/** Type definition for rule data. */
interface LineMeta {
  /** EndIndex field value. */
  endIndex: number;

  /** EndOffset field value. */
  endOffset: number;

  /** LineIndex field value. */
  lineIndex: number;
}

/** Type definition for rule data. */
interface LineMetaContext {
  /** CommentValue field value. */
  commentValue: string;

  /** Full field value. */
  full: string;

  /** StartOffset field value. */
  startOffset: number;
}

/**
 * Extracts the language from a fence line when present.
 * @param line Fence line to inspect.
 * @returns Language tag when present.
 * @example
 * ```typescript
 * const lang = getFenceLanguage(" * ```typescript");
 * ```
 */
function getFenceLanguage(line: string): string | undefined {
  const fenceMatch = /^(?<leading>\s*\*?\s*)```(?<lang>[^\s`]+)?[ \t]*$/u.exec(
    line,
  );

  if (fenceMatch === null) {
    return void 0;
  }

  return fenceMatch.groups?.["lang"] ?? "";
}

/**
 * Extracts inline example content from the header line.
 * @param header Example header line.
 * @returns Inline example content.
 * @example
 * ```typescript
 * const text = getInlineContent("* @example hello");
 * ```
 */
function getInlineContent(header: string): string {
  const inlineMatch = /^.*@example\b\s?(?<c>.*)$/u.exec(header);

  return inlineMatch?.groups?.["c"] ?? "";
}

/**
 * Computes line metadata from the raw comment value.
 * @param context Comment metadata context.
 * @returns Line metadata for the example.
 * @example
 * ```typescript
 * const meta = getLineMeta({ commentValue: "* ok", full: "* ok", startOffset: 0 });
 * ```
 */
function getLineMeta(context: LineMetaContext): LineMeta {
  const { commentValue, full, startOffset } = context;
  const lineIndex =
    commentValue.slice(0, startOffset).split(/\r?\n/u).length - 1;
  const endOffset = startOffset + full.length;
  const endIndex = lineIndex + full.split(/\r?\n/u).length - 1;

  return { endIndex, endOffset, lineIndex };
}

/**
 * Resolves the leading prefix used by example lines.
 * @param header Example header line.
 * @returns The leading prefix string.
 * @example
 * ```typescript
 * const prefix = getPrefix(" * @example");
 * ```
 */
function getPrefix(header: string): string {
  const prefixMatch = header.indexOf("@example");

  if (prefixMatch === -1) {
    return "";
  }

  return header.slice(0, prefixMatch);
}

/**
 * Determines whether a content line contains non-empty example text.
 * @param line Line text to check.
 * @returns True when the line contains content.
 * @example
 * ```typescript
 * const ok = hasLineContent(" * const value = 1;");
 * ```
 */
function hasLineContent(line: string): boolean {
  const trimmed = line.replace(/^\s*\*?\s?/u, "").trim();
  return trimmed.length > 0;
}

export {
  getFenceLanguage,
  getInlineContent,
  getLineMeta,
  getPrefix,
  hasLineContent,
};
