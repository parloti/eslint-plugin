import { readdirSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";

/** Default barrel basenames used when no options are supplied. */
const DEFAULT_ALLOWED_BARREL_NAMES = ["index"];
/** Declaration-only suffixes that should be ignored during module checks. */
const DECLARATION_FILE_SUFFIXES = [".d.cts", ".d.mts", ".d.ts"];
/** Module suffixes that participate in barrel-file evaluation. */
const MODULE_FILE_SUFFIXES = [
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
];

/** Captures whether a directory contains barrel and non-barrel modules. */
interface DirectoryBarrelState {
  /** Whether the directory includes an allowed barrel file. */
  hasAllowedBarrelFile: boolean;
  /** Whether the directory includes any non-barrel module file. */
  hasNonBarrelModuleFile: boolean;
  /** The first non-barrel module file discovered in the directory. */
  primaryNonBarrelModuleFile: string | undefined;
}

/** Stores the module filename and derived stem for a directory entry. */
interface DirectoryModuleFile {
  /** The original filename of the module entry. */
  name: string;
  /** The filename stem after stripping the module suffix. */
  stem: string;
}

/**
 * Normalizes allowed barrel names from raw rule input.
 * @param value Raw allowed barrel names input.
 * @returns The normalized barrel names.
 * @example
 * ```typescript
 * const names = normalizeAllowedBarrelNames(["index", "barrel"]);
 * ```
 */
const normalizeAllowedBarrelNames = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [...DEFAULT_ALLOWED_BARREL_NAMES];
  }

  const names = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return names.length === 0 ? [...DEFAULT_ALLOWED_BARREL_NAMES] : names;
};

/**
 * Converts an absolute filename into a repo-relative path.
 * @param filename Absolute filename to convert.
 * @returns The repo-relative path when the file is inside the repo.
 * @example
 * ```typescript
 * const relativePath = getRepoRelativePath(`${cwd()}/src/index.ts`);
 * ```
 */
const getRepoRelativePath = (filename: string): string | undefined => {
  if (filename.length === 0 || !path.isAbsolute(filename)) {
    return void 0;
  }

  const relativePath = path.relative(cwd(), filename);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return void 0;
  }

  return relativePath.split(path.sep).join("/");
};

/**
 * Derives the module stem for a supported source file.
 * @param filename Filename to inspect.
 * @returns The module stem when the filename is lintable.
 * @example
 * ```typescript
 * const stem = getModuleFileStem("index.ts");
 * ```
 */
const getModuleFileStem = (filename: string): string | undefined => {
  const basename = path.basename(filename);

  if (DECLARATION_FILE_SUFFIXES.some((suffix) => basename.endsWith(suffix))) {
    return void 0;
  }

  for (const suffix of MODULE_FILE_SUFFIXES) {
    if (basename.endsWith(suffix)) {
      return basename.slice(0, -suffix.length);
    }
  }

  return void 0;
};

/**
 * Determines whether a filename is a lintable module file.
 * @param filename Filename to inspect.
 * @returns True when the filename belongs to a supported module inside the repo.
 * @example
 * ```typescript
 * const lintable = isLintableModuleFile(`${cwd()}/src/index.ts`);
 * ```
 */
const isLintableModuleFile = (filename: string): boolean => {
  return (
    getRepoRelativePath(filename) !== void 0 &&
    getModuleFileStem(filename) !== void 0
  );
};

/**
 * Determines whether a filename matches an allowed barrel name.
 * @param filename Filename to inspect.
 * @param allowedBarrelNames Allowed barrel names for the rule run.
 * @returns True when the filename is a barrel file.
 * @example
 * ```typescript
 * const barrel = isBarrelFile(`${cwd()}/src/index.ts`, new Set(["index"]));
 * ```
 */
const isBarrelFile = (
  filename: string,
  allowedBarrelNames: ReadonlySet<string>,
): boolean => {
  const stem = getModuleFileStem(filename);

  return stem !== void 0 && allowedBarrelNames.has(stem);
};

/**
 * Lists module files in a directory with their derived stems.
 * @param directory Directory to inspect.
 * @returns The sorted module files for the directory.
 * @example
 * ```typescript
 * const files = getDirectoryModuleFiles(`${cwd()}/src`);
 * ```
 */
const getDirectoryModuleFiles = (directory: string): DirectoryModuleFile[] => {
  try {
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const stem = getModuleFileStem(entry.name);

        return stem === void 0 ? void 0 : { name: entry.name, stem };
      })
      .filter((entry): entry is DirectoryModuleFile => entry !== void 0)
      .toSorted((left, right) => left.name.localeCompare(right.name));
  } catch {
    return [];
  }
};

/**
 * Builds barrel-related state for a directory.
 * @param directory Directory to inspect.
 * @param allowedBarrelNames Allowed barrel names for the rule run.
 * @returns The derived barrel state for the directory.
 * @example
 * ```typescript
 * const state = getDirectoryBarrelState(`${cwd()}/src`, new Set(["index"]));
 * ```
 */
const getDirectoryBarrelState = (
  directory: string,
  allowedBarrelNames: ReadonlySet<string>,
): DirectoryBarrelState => {
  const moduleFiles = getDirectoryModuleFiles(directory);
  const primaryNonBarrelModuleFile = moduleFiles.find(
    (entry) => !allowedBarrelNames.has(entry.stem),
  )?.name;

  return {
    hasAllowedBarrelFile: moduleFiles.some((entry) =>
      allowedBarrelNames.has(entry.stem),
    ),
    hasNonBarrelModuleFile: primaryNonBarrelModuleFile !== void 0,
    primaryNonBarrelModuleFile,
  };
};

export {
  DEFAULT_ALLOWED_BARREL_NAMES,
  getDirectoryBarrelState,
  isBarrelFile,
  isLintableModuleFile,
  normalizeAllowedBarrelNames,
};
export type { DirectoryBarrelState };
