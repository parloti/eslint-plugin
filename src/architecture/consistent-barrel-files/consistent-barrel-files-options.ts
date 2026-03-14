import { minimatch } from "minimatch";
import path from "node:path";

import type { ConsistentBarrelFilesOptions } from "./types";

/** Default value used by this module. */
const DEFAULT_BARREL_NAMES = ["index.ts", "index.tsx", "index.js", "index.jsx"];

/** Default folder globs for barrel file checks. */
const DEFAULT_FOLDER_GLOBS = ["src/**"];

/** Type definition for rule data. */
interface ConsistentBarrelFilesState {
  /** Enforce field value. */
  enforce: boolean;

  /** Folders field value. */
  folders: string[];

  /** Names field value. */
  names: string[];

  /** NamesKey field value. */
  namesKey: string;

  /** NamesSet field value. */
  namesSet: Set<string>;
}

/**
 * Normalizes normalizeNames.
 * @param names Input names value.
 * @returns Return value output.
 * @example
 * ```typescript
 * normalizeNames();
 * ```
 */
const normalizeNames = (names: unknown): string[] => {
  if (Array.isArray(names)) {
    return names
      .filter((name): name is string => typeof name === "string")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
  }

  if (typeof names === "string") {
    const trimmed = names.trim();
    return trimmed.length === 0 ? [] : [trimmed];
  }

  return [...DEFAULT_BARREL_NAMES];
};

/**
 * Normalizes normalizeFolders.
 * @param folders Input folders value.
 * @returns Return value output.
 * @example
 * ```typescript
 * normalizeFolders();
 * ```
 */
const normalizeFolders = (folders: unknown): string[] => {
  if (Array.isArray(folders)) {
    return folders
      .filter((folder): folder is string => typeof folder === "string")
      .map((folder) => folder.trim())
      .filter((folder) => folder.length > 0);
  }

  if (typeof folders === "string") {
    const trimmed = folders.trim();
    return trimmed.length === 0 ? [] : [trimmed];
  }

  return [...DEFAULT_FOLDER_GLOBS];
};

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
  const folders = normalizeFolders(rawOptions?.folders);
  const names = normalizeNames(rawOptions?.names);
  const namesKey = names.toSorted().join("|");

  return { enforce, folders, names, namesKey, namesSet: new Set(names) };
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
  filename.length > 0 && path.isAbsolute(filename);

/**
 * Normalizes normalizeRelativePath.
 * @param filename Input filename value.
 * @returns Return value output.
 * @example
 * ```typescript
 * normalizeRelativePath();
 * ```
 */
const normalizeRelativePath = (filename: string): string =>
  path.relative(process.cwd(), filename).split(path.sep).join("/");

/**
 * Checks isPathInFolders.
 * @param filename Input filename value.
 * @param folders Input folders value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isPathInFolders();
 * ```
 */
const isPathInFolders = (filename: string, folders: string[]): boolean => {
  const relativePath = normalizeRelativePath(filename);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return false;
  }

  return folders.some((folder) =>
    minimatch(relativePath, folder, { dot: true }),
  );
};

/**
 * Determines whether a file should be checked.
 * @param filename Absolute filename.
 * @param folders Folder glob patterns.
 * @param names Allowed barrel names.
 * @returns True when the file should be linted.
 * @example
 * ```typescript
 * const ok = shouldLintFile(filename, folders, names);
 * ```
 */
const shouldLintFile = (
  filename: string,
  folders: string[],
  names: string[],
): boolean => {
  if (folders.length === 0) {
    return false;
  }

  if (!isPathInFolders(filename, folders)) {
    return false;
  }

  return names.length > 0;
};

export { getOptions, isLintableFilename, shouldLintFile };
export type { ConsistentBarrelFilesState };
