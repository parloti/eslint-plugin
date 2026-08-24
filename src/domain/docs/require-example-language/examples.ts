import type { Example, Problem } from "./types";

import {
  getFenceLanguage,
  getInlineContent,
  getLineMeta,
  getPrefix,
  hasLineContent,
} from "./example-utilities";

/** Type definition for rule data. */
interface ExampleContentContext {
  /** Body field value. */
  body: string;

  /** Header field value. */
  header: string;
}

/** Type definition for rule data. */
interface ExampleFromPartsContext {
  /** BodyLines field value. */
  bodyLines: string[];

  /** CommentValue field value. */
  commentValue: string;

  /** EndOffset field value. */
  endOffset: number;

  /** Header field value. */
  header: string;

  /** StartOffset field value. */
  startOffset: number;
}

/** Type definition for rule data. */
interface FenceAnalysis {
  /** HasEmptyFence field value. */
  hasEmptyFence: boolean;

  /** HasOutsideFenceContent field value. */
  hasOutsideFenceContent: boolean;

  /** MissingLanguage field value. */
  missingLanguage: boolean;

  /** SawFence field value. */
  sawFence: boolean;
}

/** Type definition for rule data. */
interface FenceState {
  /** CurrentFenceHasContent field value. */
  currentFenceHasContent: boolean;

  /** HasEmptyFence field value. */
  hasEmptyFence: boolean;

  /** HasOutsideFenceContent field value. */
  hasOutsideFenceContent: boolean;

  /** InFence field value. */
  inFence: boolean;

  /** MissingLanguage field value. */
  missingLanguage: boolean;

  /** SawFence field value. */
  sawFence: boolean;
}

/**
 * Updates fence state based on the detected language.
 * @param state Current fence tracking state.
 * @param language Fence language string.
 * @returns Updated fence tracking state.
 * @example
 * ```typescript
 * const next = updateFenceState(state, "typescript");
 * ```
 */
const updateFenceState = (state: FenceState, language: string): FenceState => {
  if (!state.inFence) {
    if (language.length === 0) {
      return { ...state, missingLanguage: true, sawFence: true };
    }

    return {
      ...state,
      currentFenceHasContent: false,
      inFence: true,
      missingLanguage: false,
      sawFence: true,
    };
  }

  return {
    ...state,
    currentFenceHasContent: false,
    hasEmptyFence: state.hasEmptyFence || !state.currentFenceHasContent,
    inFence: false,
    missingLanguage: false,
    sawFence: true,
  };
};

/**
 * Updates fence tracking for a single example line.
 * @param state Current fence tracking state.
 * @param line Example line to inspect.
 * @returns Updated fence tracking state.
 * @example
 * ```typescript
 * const next = updateFenceStateForLine(state, " * ok");
 * ```
 */
const updateFenceStateForLine = (
  state: FenceState,
  line: string,
): FenceState => {
  const language = getFenceLanguage(line);

  if (language !== void 0) {
    return updateFenceState(state, language);
  }

  if (state.inFence && hasLineContent(line)) {
    return { ...state, currentFenceHasContent: true };
  }

  if (!state.inFence && hasLineContent(line)) {
    return { ...state, hasOutsideFenceContent: true };
  }

  return state;
};

/**
 * Analyzes fenced code blocks for missing language identifiers.
 * @param content Example content to analyze.
 * @returns Fence analysis results.
 * @example
 * ```typescript
 * const analysis = analyzeFenceContent("```typescript\nconst value = 1;\n```");
 * ```
 */
function analyzeFenceContent(content: string): FenceAnalysis {
  const lines = content.split(/\r?\n/u);
  let state: FenceState = {
    currentFenceHasContent: false,
    hasEmptyFence: false,
    hasOutsideFenceContent: false,
    inFence: false,
    missingLanguage: false,
    sawFence: false,
  };

  for (const line of lines) {
    state = updateFenceStateForLine(state, line);

    if (state.missingLanguage) {
      break;
    }
  }

  if (state.inFence && !state.currentFenceHasContent) {
    state = { ...state, hasEmptyFence: true };
  }

  return {
    hasEmptyFence: state.hasEmptyFence,
    hasOutsideFenceContent: state.hasOutsideFenceContent,
    missingLanguage: state.missingLanguage,
    sawFence: state.sawFence,
  };
}

/**
 * Builds example content from an inline header and body lines.
 * @param context Example header and body lines.
 * @returns Combined example content.
 * @example
 * ```typescript
 * const content = buildExampleContent({ body: "* ok", header: "* @example" });
 * ```
 */
function buildExampleContent(context: ExampleContentContext): string {
  const { body, header } = context;
  const inlineContent = getInlineContent(header);

  if (inlineContent.length > 0) {
    return `${inlineContent}\n${body}`;
  }

  return body;
}

/**
 * Builds an Example from parsed header and body data.
 * @param context Parsed example context.
 * @returns Example metadata extracted from the parsed data.
 * @example
 * ```typescript
 * const example = buildExampleFromParts(context);
 * ```
 */
function buildExampleFromParts(context: ExampleFromPartsContext): Example {
  const { bodyLines, commentValue, endOffset, header, startOffset } = context;
  const content = buildExampleContent({ body: bodyLines.join("\n"), header });
  const full = commentValue.slice(startOffset, endOffset);
  const lineMeta = getLineMeta({
    commentValue,
    full,
    startOffset,
  });

  return {
    content: content.trim(),
    endIndex: lineMeta.endIndex,
    endOffset,
    lineIndex: lineMeta.lineIndex,
    prefix: getPrefix(header),
    startOffset,
  };
}

/**
 * Checks example content for required fences and language.
 * @param content Example content to inspect.
 * @returns Problem identifier when the content is invalid.
 * @example
 * ```typescript
 * const problem = checkExampleContent("```typescript\nconst ok = true;\n```");
 * ```
 */
function checkExampleContent(content: string): Problem | undefined {
  if (content.trim().length === 0) {
    return "emptyExample";
  }

  const { hasEmptyFence, hasOutsideFenceContent, missingLanguage, sawFence } =
    analyzeFenceContent(content);

  if (missingLanguage) {
    return "missingLanguage";
  }

  if (sawFence && hasOutsideFenceContent) {
    return "contentOutsideFence";
  }

  if (sawFence && hasEmptyFence) {
    return "emptyExample";
  }

  if (!sawFence) {
    return "missingFence";
  }

  return void 0;
}

export { buildExampleFromParts, checkExampleContent };
