import fs from "node:fs";
import path from "node:path";

/**
 *
 */
const DEFAULT_ALLOWED_BARREL_NAMES = ["index"];

/**
 *
 */
const DECLARATION_FILE_SUFFIXES = [".d.cts", ".d.mts", ".d.ts"];

/**
 *
 */
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

/**
 *
 */
interface DirectoryBarrelState {
  /**
   *
   */
  hasAllowedBarrelFile: boolean;

  /**
   *
   */
  hasNonBarrelModuleFile: boolean;

  /**
   *
   */
  primaryNonBarrelModuleFile: string | undefined;
}

/**
 *
 */
interface DirectoryModuleFile {
  /**
   *
   */
  name: string;

  /**
   *
   */
  stem: string;
}

/**
 * @param value
 * @example
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
 * @param filename
 * @example
 */
const getRepoRelativePath = (filename: string): string | undefined => {
  if (filename.length === 0 || !path.isAbsolute(filename)) {
    return void 0;
  }

  const relativePath = path.relative(process.cwd(), filename);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return void 0;
  }

  return relativePath.split(path.sep).join("/");
};

/**
 * @param filename
 * @example
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
 * @param filename
 * @example
 */
const isLintableModuleFile = (filename: string): boolean => {
  return (
    getRepoRelativePath(filename) !== void 0 &&
    getModuleFileStem(filename) !== void 0
  );
};

/**
 * @param filename
 * @param allowedBarrelNames
 * @example
 */
const isBarrelFile = (
  filename: string,
  allowedBarrelNames: ReadonlySet<string>,
): boolean => {
  const stem = getModuleFileStem(filename);

  return stem !== void 0 && allowedBarrelNames.has(stem);
};

/**
 * @param directory
 * @example
 */
const getDirectoryModuleFiles = (directory: string): DirectoryModuleFile[] => {
  try {
    return fs
      .readdirSync(directory, { withFileTypes: true })
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
 * @param directory
 * @param allowedBarrelNames
 * @example
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
