import type { Rule } from "eslint";

import { buildListenerForFilename as buildListenerForFilenameImpl } from "./require-test-companion-listeners";
import { getOptions as getOptionsImpl } from "./require-test-companion-options";

/** Normalized options state type. */
type RequireTestCompanionState = ReturnType<typeof getOptionsImpl>;

/**
 * Build a rule listener for a source filename.
 * @param context Rule execution context.
 * @param filename Source file path.
 * @param options Normalized rule options state.
 * @returns Rule listener for the file.
 * @example
 * ```typescript
 * const listener = buildListenerForFilename(context, filename, options);
 * ```
 */
const buildListenerForFilename = (
  context: Rule.RuleContext,
  filename: string,
  options: RequireTestCompanionState,
): Rule.RuleListener =>
  buildListenerForFilenameImpl(context, filename, options);

/**
 * Normalize rule options for the listener.
 * @param options Raw rule options.
 * @returns Normalized rule options state.
 * @example
 * ```typescript
 * const options = getOptions([]);
 * ```
 */
const getOptions = (options: readonly unknown[]): RequireTestCompanionState =>
  getOptionsImpl(options);

export { buildListenerForFilename, getOptions };
