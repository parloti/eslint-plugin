import type { AST } from "eslint";

import { minimatch } from "minimatch";
import path from "node:path";

import type { NoReexportsOutsideBarrelsOptions } from "./types";

/** Default value used by this module. */
const DEFAULT_BARREL_NAMES = ["index.ts", "index.tsx", "index.js", "index.jsx"];

/** Default folder globs for non-barrel re-export checks. */
const DEFAULT_FOLDER_GLOBS = ["src/*/**"];

/** Type definition for rule data. */
interface NoReexportsOutsideBarrelsState {
  /** Folders field value. */
  folders: string[];

  /** Names field value. */
  names: string[];

  /** NamesSet field value. */
  namesSet: Set<string>;
}

/**
 * Normalizes a string list option into a clean list.
 * @param value Raw option value.
 * @param defaults Default list when the option is empty.
 * @returns Normalized string list.
 * @example
 * ```typescript
 * const names = normalizeList("index.ts", ["index.ts"]);
 * ```
 */
const normalizeList = (value: unknown, defaults: string[]): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 ? [] : [trimmed];
  }

  return [...defaults];
};

/**
 * Builds the rule options state from raw options.
 * @param options Raw rule options.
 * @returns Normalized rule options.
 * @example
 * ```typescript
 * const state = getOptions([{}]);
 * ```
 */
const getOptions = (
  options: readonly unknown[],
): NoReexportsOutsideBarrelsState => {
  const rawOptions = options[0] as NoReexportsOutsideBarrelsOptions | undefined;
  const folders = normalizeList(rawOptions?.folders, DEFAULT_FOLDER_GLOBS);
  const names = normalizeList(rawOptions?.names, DEFAULT_BARREL_NAMES);

  return { folders, names, namesSet: new Set(names) };
};

/**
 * Checks whether the filename is valid for linting.
 * @param filename Absolute filename.
 * @returns True when the filename is lintable.
 * @example
 * ```typescript
 * const ok = isLintableFilename("/repo/src/index.ts");
 * ```
 */
const isLintableFilename = (filename: string): boolean =>
  filename.length > 0 && path.isAbsolute(filename);

/**
 * Normalizes a filename to a repo-relative path.
 * @param filename Absolute filename.
 * @returns Relative path using forward slashes.
 * @example
 * ```typescript
 * const relative = normalizeRelativePath("/repo/src/index.ts");
 * ```
 */
const normalizeRelativePath = (filename: string): string =>
  path.relative(process.cwd(), filename).split(path.sep).join("/");

/**
 * Checks whether a file path matches any configured folder globs.
 * @param filename Absolute filename.
 * @param folders Folder glob patterns.
 * @returns True when the filename is within configured folders.
 * @example
 * ```typescript
 * const ok = isPathInFolders("/repo/src/index.ts", ["src/**"]);
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
 * Determines whether a file should be linted by this rule.
 * @param filename Absolute filename.
 * @param options Normalized rule options.
 * @returns True when the file should be checked.
 * @example
 * ```typescript
 * const ok = shouldLintFile("/repo/src/index.ts", state);
 * ```
 */
const shouldLintFile = (
  filename: string,
  options: NoReexportsOutsideBarrelsState,
): boolean => {
  if (!isLintableFilename(filename)) {
    return false;
  }

  if (options.folders.length === 0 || options.names.length === 0) {
    return false;
  }

  return isPathInFolders(filename, options.folders);
};

/**
 * Determines whether a file is a barrel file under the rule options.
 * @param filename Absolute filename.
 * @param options Normalized rule options.
 * @returns True when the file is a barrel file.
 * @example
 * ```typescript
 * const ok = isBarrelFile("/repo/src/index.ts", state);
 * ```
 */
const isBarrelFile = (
  filename: string,
  options: NoReexportsOutsideBarrelsState,
): boolean => {
  return options.namesSet.has(path.basename(filename));
};

/**
 * Collects imported identifiers from the program body.
 * @param body Program body statements.
 * @returns Set of local imported identifiers.
 * @example
 * ```typescript
 * const names = collectImportedNames(program.body);
 * ```
 */
const collectImportedNames = (body: AST.Program["body"]): Set<string> => {
  const importedNames = new Set<string>();

  for (const statement of body) {
    if (statement.type === "ImportDeclaration") {
      for (const specifier of statement.specifiers) {
        importedNames.add(specifier.local.name);
      }
    }
  }

  return importedNames;
};

/**
 * Checks whether an export specifier references an imported identifier.
 * @param statement Export named declaration statement.
 * @param importedNames Set of imported identifiers.
 * @returns True when any export specifier references an import.
 * @example
 * ```typescript
 * const ok = hasImportedExport(statement, names);
 * ```
 */
const hasImportedExport = (
  statement: AST.Program["body"][number],
  importedNames: Set<string>,
): boolean => {
  if (
    statement.type !== "ExportNamedDeclaration" ||
    (statement.source !== null && statement.source !== void 0) ||
    (statement.declaration !== null && statement.declaration !== void 0)
  ) {
    return false;
  }

  return statement.specifiers.some(
    (specifier) =>
      specifier.local.type === "Identifier" &&
      importedNames.has(specifier.local.name),
  );
};

export {
  collectImportedNames,
  getOptions,
  hasImportedExport,
  isBarrelFile,
  shouldLintFile,
};
