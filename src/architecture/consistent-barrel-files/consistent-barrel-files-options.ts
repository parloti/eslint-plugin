import path from "node:path";

import type { ConsistentBarrelFilesOptions } from "./types";

import {
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
 * Builds normalized rule options from raw rule input.
 * @param options Raw rule options.
 * @returns The normalized rule state.
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
 * Determines whether a filename is eligible for linting.
 * @param filename Filename to inspect.
 * @returns True when the filename is a lintable module file.
 * @example
 * ```typescript
 * const lintable = isLintableFilename(`${cwd()}/src/index.ts`);
 * ```
 */
const isLintableFilename = (filename: string): boolean =>
  isLintableModuleFile(filename);

/**
 * Checks whether a path is nested inside a src directory.
 * @param filename Filename to inspect.
 * @returns True when the file path contains a src path segment.
 * @example
 * ```typescript
 * const inSrc = isInSourceDirectory(`${cwd()}/src/index.ts`);
 * ```
 */
const isInSourceDirectory = (filename: string): boolean => {
  const normalizedPath = path.normalize(filename);
  const pathSegments = normalizedPath.split(path.sep).filter(Boolean);

  return pathSegments.includes("src");
};

/**
 * Determines whether the rule should lint a file.
 * @param filename Filename to inspect.
 * @param allowedNames Allowed barrel names for the rule run.
 * @returns True when the file should be checked.
 * @example
 * ```typescript
 * const shouldLint = shouldLintFile(`${cwd()}/src/index.ts`, ["index"]);
 * ```
 */
const shouldLintFile = (filename: string, allowedNames: string[]): boolean => {
  return (
    isLintableFilename(filename) &&
    isInSourceDirectory(filename) &&
    allowedNames.length > 0
  );
};

export { getOptions, isLintableFilename, shouldLintFile };
export type { ConsistentBarrelFilesState };
