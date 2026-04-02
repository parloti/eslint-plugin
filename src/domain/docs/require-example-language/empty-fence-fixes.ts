/** Type definition for rule data. */
interface EmptyFenceState {
  /** CurrentFence field value. */
  currentFence: string[];

  /** HasFenceContent field value. */
  hasFenceContent: boolean;

  /** HasNonEmptyFence field value. */
  hasNonEmptyFence: boolean;

  /** InFence field value. */
  inFence: boolean;

  /** Output field value. */
  output: string[];

  /** Removed field value. */
  removed: boolean;
}

/** Type definition for rule data. */
interface FenceLineInfo {
  /** Language field value. */
  language: string;

  /** Leading field value. */
  leading: string;
}

/**
 * Closes a fence and updates the state.
 * @param state Current fence state.
 * @param line Fence line being processed.
 * @returns Updated fence state.
 * @example
 * ```typescript
 * const next = closeFence(state, " * ```");
 * ```
 */
function closeFence(state: EmptyFenceState, line: string): EmptyFenceState {
  const fenceLines = [...state.currentFence, line];
  const shouldRemove = !state.hasFenceContent;
  const hasNonEmptyFence = state.hasNonEmptyFence || state.hasFenceContent;
  const output = shouldRemove ? state.output : [...state.output, ...fenceLines];

  return {
    ...state,
    currentFence: [],
    hasFenceContent: false,
    hasNonEmptyFence,
    inFence: false,
    output,
    removed: state.removed || shouldRemove,
  };
}

/**
 * Finalizes fence output, including any unclosed fences.
 * @param state Current fence state.
 * @returns Finalized fence state.
 * @example
 * ```typescript
 * const next = finalizeFenceState(state);
 * ```
 */
function finalizeFenceState(state: EmptyFenceState): EmptyFenceState {
  if (state.inFence) {
    return {
      ...state,
      currentFence: [],
      hasFenceContent: false,
      hasNonEmptyFence: state.hasNonEmptyFence || state.hasFenceContent,
      inFence: false,
      output: [...state.output, ...state.currentFence],
    };
  }

  return state;
}

/**
 * Determines whether a line contains non-empty content.
 * @param line Line text to check.
 * @returns True when the line contains content.
 * @example
 * ```typescript
 * const ok = isContentLine(" * const ok = true;");
 * ```
 */
function isContentLine(line: string): boolean {
  const trimmed = line.replace(/^\s*\*?\s?/u, "").trim();
  return trimmed.length > 0;
}

/**
 * Opens a new fenced block.
 * @param state Current fence state.
 * @param line Fence line being processed.
 * @returns Updated fence state.
 * @example
 * ```typescript
 * const next = openFence(state, " * ```typescript");
 * ```
 */
function openFence(state: EmptyFenceState, line: string): EmptyFenceState {
  return {
    ...state,
    currentFence: [line],
    hasFenceContent: false,
    hasNonEmptyFence: state.hasNonEmptyFence,
    inFence: true,
  };
}

/**
 * Parses a fence line for its leading prefix and language.
 * @param line Fence line to parse.
 * @returns Parsed fence info when matched.
 * @example
 * ```typescript
 * const info = parseFenceLine(" * ```typescript");
 * ```
 */
function parseFenceLine(line: string): FenceLineInfo | undefined {
  const fenceMatch = /^(?<leading>\s*\*?\s*)```(?<lang>[^\s`]+)?[ \t]*$/u.exec(
    line,
  );

  if (fenceMatch === null) {
    return void 0;
  }

  const groups = fenceMatch.groups ?? {};
  const leading =
    typeof groups["leading"] === "string" ? groups["leading"] : "";
  const language = typeof groups["lang"] === "string" ? groups["lang"] : "";

  return { language, leading };
}

/**
 * Removes fenced blocks that contain no content.
 * @param original Original comment text.
 * @returns Updated comment text when a fence is removed.
 * @example
 * ```typescript
 * const updated = removeEmptyFences("* ```typescript\n* ```\n* ok");
 * ```
 */
function removeEmptyFences(original: string): string | undefined {
  const lineBreak = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = original.split(/\r?\n/u);
  const initialState: EmptyFenceState = {
    currentFence: [],
    hasFenceContent: false,
    hasNonEmptyFence: false,
    inFence: false,
    output: [],
    removed: false,
  };
  let state = initialState;

  for (const line of lines) {
    const fenceInfo = parseFenceLine(line);
    state =
      fenceInfo === void 0
        ? updateContentState(state, line)
        : updateFenceState(state, line);
  }

  const finalState = finalizeFenceState(state);

  return finalState.removed && finalState.hasNonEmptyFence
    ? finalState.output.join(lineBreak)
    : void 0;
}

/**
 * Updates the state with a non-fence line.
 * @param state Current fence state.
 * @param line Line being processed.
 * @returns Updated fence state.
 * @example
 * ```typescript
 * const next = updateContentState(state, " * const ok = true;");
 * ```
 */
function updateContentState(
  state: EmptyFenceState,
  line: string,
): EmptyFenceState {
  if (state.inFence) {
    return {
      ...state,
      currentFence: [...state.currentFence, line],
      hasFenceContent: state.hasFenceContent || isContentLine(line),
    };
  }

  return { ...state, output: [...state.output, line] };
}

/**
 * Opens or closes a fence based on the current state.
 * @param state Current fence state.
 * @param line Fence line being processed.
 * @returns Updated fence state.
 * @example
 * ```typescript
 * const next = updateFenceState(state, " * ```");
 * ```
 */
function updateFenceState(
  state: EmptyFenceState,
  line: string,
): EmptyFenceState {
  if (state.inFence) {
    return closeFence(state, line);
  }

  return openFence(state, line);
}

export { parseFenceLine, removeEmptyFences };
