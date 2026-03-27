import type { ConsistentBarrelFilesOptions } from "./types";

import {
  DEFAULT_ALLOWED_BARREL_NAMES,
  isLintableModuleFile,
  normalizeAllowedBarrelNames,
} from "./barrel-file-utilities";

/** Type definition for rule data. */
interface ConsistentBarrelFilesState {
  /** AllowedNames field value. */
  allowedNames: string[];

  /** AllowedNamesKey field value. */
  allowedNamesKey: string;

  /** AllowedNamesSet field value. */
  allowedNamesSet: Set<string>;

  /** Enforce field value. */
  enforce: boolean;
}

/**
 * Builds normalized rule options from raw input.
 * @param options Raw rule options array.
 * @returns Normalized rule options.
 * @example
 * ```typescript
 * const state = getOptions([{}]);
 * ```
 */
const getOptions = (
  options: readonly unknown[],
): ConsistentBarrelFilesState => {
  const rawOptions = options[0] as ConsistentBarrelFilesOptions | undefined;
  const enforce = rawOptions?.enforce ?? true;
  const allowedNames = normalizeAllowedBarrelNames(rawOptions?.allowedNames);
  const allowedNamesKey = allowedNames.toSorted().join("|");

  return {
    allowedNames,
    allowedNamesKey,
    allowedNamesSet: new Set(allowedNames),
    enforce,
  };
};

/**
 * Checks isLintableFilename.
 * @param filename Input filename value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isLintableFilename();
 * ```
 */
const isLintableFilename = (filename: string): boolean =>
  isLintableModuleFile(filename);

/**
 * Determines whether a file should be checked.
 * @param filename Absolute filename.
 * @param folders Folder glob patterns.
 * @param names Allowed barrel names.
 * @param allowedNames
 * @returns True when the file should be linted.
 * @example
 * ```typescript
 * const ok = shouldLintFile(filename, folders, names);
 * ```
 */
const shouldLintFile = (filename: string, allowedNames: string[]): boolean => {
  return isLintableFilename(filename) && allowedNames.length > 0;
};

export { getOptions, isLintableFilename, shouldLintFile };
export type { ConsistentBarrelFilesState };
