import type { Rule } from "eslint";

import type { Example, Problem } from "./types";

import { parseFenceLine, removeEmptyFences } from "./empty-fence-fixes";

/** Type definition for rule data. */
interface EmptyExampleFixContext {
  /** Example field value. */
  example: Example;
  /** HasOtherExamples field value. */
  hasOtherExamples: boolean;
  /** Original field value. */
  original: string;
}

/** Type definition for rule data. */
interface FenceLanguageContext {
  /** InFence field value. */
  inFence: boolean;
  /** Line field value. */
  line: string;
}

/** Type definition for rule data. */
interface FenceResult {
  /** InFence field value. */
  inFence: boolean;
  /** Line field value. */
  line: string;
}

/** Type definition for rule data. */
interface FixerContext {
  /** AbsoluteEnd field value. */
  absoluteEnd: number;
  /** AbsoluteStart field value. */
  absoluteStart: number;
  /** Example field value. */
  example: Example;
  /** HasOtherExamples field value. */
  hasOtherExamples: boolean;
  /** Problem field value. */
  problem: Problem;
  /** SourceText field value. */
  sourceText: string;
}

/** Type definition for rule data. */
interface NormalizeContentLinesContext {
  /** Content field value. */
  content: string;
  /** Prefix field value. */
  prefix: string;
}

/** Type definition for rule data. */
interface StripContentPrefixContext {
  /** Line field value. */
  line: string;
  /** Prefix field value. */
  prefix: string;
}

/**
 * Applies a language to a fence line when needed.
 * @param context Fence state and line data.
 * @returns Updated line and fence state.
 * @example
 * ```typescript
 * const result = applyFenceLanguage({ inFence: false, line: " * ```" });
 * ```
 */
function applyFenceLanguage(context: FenceLanguageContext): FenceResult {
  const { inFence, line } = context;
  const fenceInfo = parseFenceLine(line);

  if (fenceInfo === void 0) {
    return { inFence, line };
  }

  const shouldAddLanguage = !inFence && fenceInfo.language.length === 0;
  const nextLine = shouldAddLanguage
    ? `${fenceInfo.leading}\`\`\`typescript`
    : line;

  return { inFence: !inFence, line: nextLine };
}

/**
 * Builds a full example with a fenced block when missing entirely.
 * @param example Example metadata.
 * @returns Example text with a fenced block.
 * @example
 * ```typescript
 * const text = buildMissingFenceFix(example);
 * ```
 */
function buildMissingFenceFix(example: Example): string {
  const contentLines = normalizeContentLines({
    content: example.content,
    prefix: example.prefix,
  });

  return [
    `${example.prefix}@example`,
    `${example.prefix}\`\`\`typescript`,
    ...contentLines.map((contentLine) =>
      contentLine.length > 0
        ? `${example.prefix} ${contentLine}`
        : example.prefix,
    ),
    `${example.prefix}\`\`\``,
  ].join("\n");
}

/**
 * Adds missing languages to existing fenced blocks.
 * @param original Original comment text.
 * @returns Updated comment text when changes are made.
 * @example
 * ```typescript
 * const updated = buildMissingLanguageFix("* ```\n* ok\n* ```");
 * ```
 */
function buildMissingLanguageFix(original: string): string | undefined {
  const lineBreak = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = original.split(/\r?\n/u);
  let inFence = false;

  const updatedLines = lines.map((line) => {
    const { inFence: nextInFence, line: nextLine } = applyFenceLanguage({
      inFence,
      line,
    });
    inFence = nextInFence;
    return nextLine;
  });

  const updated = updatedLines.join(lineBreak);

  return updated === original ? void 0 : updated;
}

/**
 * Builds a fixer function for the report.
 * @param context Fixer context details.
 * @returns Fixer function for ESLint.
 * @example
 * ```typescript
 * const fixer = createFixer(context);
 * ```
 */
function createFixer(
  context: FixerContext,
): (fixer: Rule.RuleFixer) => Rule.Fix | undefined {
  const { absoluteEnd, absoluteStart } = context;

  return (fixer: Rule.RuleFixer): Rule.Fix | undefined => {
    const updated = getUpdatedExampleText(context);

    if (updated === void 0) {
      return void 0;
    }

    return fixer.replaceTextRange([absoluteStart, absoluteEnd], updated);
  };
}

/**
 * Extracts trailing whitespace from the original example range.
 * @param original Original example text.
 * @returns Trailing whitespace to preserve.
 * @example
 * ```typescript
 * const suffix = getTrailingWhitespace("* @example ok\n ");
 * ```
 */
function getTrailingWhitespace(original: string): string {
  const trailingMatch = /(?:\r?\n[ \t]*)$/u.exec(original);

  return trailingMatch?.[0] ?? "";
}

/**
 * Resolves the updated text for an example.
 * @param context Fixer context details.
 * @returns Fixed example text when a change is required.
 * @example
 * ```typescript
 * const text = getUpdatedExampleText(context);
 * ```
 */
function getUpdatedExampleText(context: FixerContext): string | undefined {
  const {
    absoluteEnd,
    absoluteStart,
    example,
    hasOtherExamples,
    problem,
    sourceText,
  } = context;
  const original = sourceText.slice(absoluteStart, absoluteEnd);

  if (problem === "missingLanguage") {
    return buildMissingLanguageFix(original);
  }

  if (problem === "emptyExample") {
    return resolveEmptyExampleFix({ example, hasOtherExamples, original });
  }

  const fixed = buildMissingFenceFix(example);
  const trailingWhitespace = getTrailingWhitespace(original);

  return trailingWhitespace.length > 0
    ? `${fixed}${trailingWhitespace}`
    : fixed;
}

/**
 * Normalizes raw example content lines before fence wrapping.
 * @param context Prefix and raw content.
 * @returns Content lines safe to wrap in a fenced block.
 * @example
 * ```typescript
 * const lines = normalizeContentLines({ content: "a\n * b", prefix: " * " });
 * ```
 */
function normalizeContentLines(context: NormalizeContentLinesContext): string[] {
  const { content, prefix } = context;
  const lines = content.length > 0 ? content.split(/\r?\n/u) : [];

  return lines
    .map((line) => stripContentPrefix({ line, prefix }))
    .map((line) => line.replace(/\s*\*\/[ \t]*$/u, ""));
}

/**
 * Resolves the appropriate fix for empty examples.
 * @param context Empty example fix details.
 * @returns Fixed example text when a change is required.
 * @example
 * ```typescript
 * const text = resolveEmptyExampleFix(context);
 * ```
 */
function resolveEmptyExampleFix(
  context: EmptyExampleFixContext,
): string | undefined {
  const { example, hasOtherExamples, original } = context;
  const cleaned = removeEmptyFences(original);

  if (cleaned !== void 0) {
    return cleaned;
  }

  if (hasOtherExamples) {
    return "";
  }

  if (original.includes("```")) {
    return void 0;
  }

  return buildMissingFenceFix(example);
}

/**
 * Removes JSDoc line prefixes from example content.
 * @param context Prefix and source line.
 * @returns Cleaned content line.
 * @example
 * ```typescript
 * const line = stripContentPrefix({ line: " * value", prefix: " * " });
 * ```
 */
function stripContentPrefix(context: StripContentPrefixContext): string {
  const { line, prefix } = context;

  if (line.startsWith(prefix)) {
    return line.slice(prefix.length);
  }

  return line.replace(/^\s*\*\s?/u, "");
}

export { buildMissingFenceFix, buildMissingLanguageFix, createFixer };