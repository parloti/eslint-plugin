import { minimatch } from "minimatch";
import path from "node:path";
import { cwd } from "node:process";

import type { RequireTestCompanionOptions } from "./types";

/** Default value used by this module. */
const DEFAULT_TEST_SUFFIXES = ["spec", "test"] as const;

/** Default value used by this module. */
const DEFAULT_IGNORE_PATTERNS = ["/*.d.ts", "/index.ts"] as const;

/** Default folders where test companions are enforced. */
const DEFAULT_ENFORCE_IN = ["src/**"] as const;

/** File extension used to detect TypeScript source files. */
const TYPESCRIPT_EXTENSION = ".ts";

/** Type definition for rule data. */
interface RequireTestCompanionState {
  /** EnforceIn field value. */
  enforceIn: string[];

  /** IgnorePatterns field value. */
  ignorePatterns: string[];

  /** TestSuffixes field value. */
  testSuffixes: string[];
}

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
 * Checks isTypeScriptFile.
 * @param filename Input filename value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isTypeScriptFile();
 * ```
 */
const isTypeScriptFile = (filename: string): boolean =>
  filename.endsWith(TYPESCRIPT_EXTENSION) && !filename.endsWith(".d.ts");

/**
 * Normalizes a rule option into a string list.
 * @param value Input value value.
 * @param defaults Input defaults value.
 * @returns Normalized list of strings.
 * @example
 * ```typescript
 * const list = normalizeList("src/**", ["src/**"]);
 * ```
 */
const normalizeList = (
  value: RequireTestCompanionOptions[keyof RequireTestCompanionOptions],
  defaults: readonly string[],
): string[] => {
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
 * Gets getOptions.
 * @param options Input options value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getOptions();
 * ```
 */
const getOptions = (options: readonly unknown[]): RequireTestCompanionState => {
  const rawOptions = options[0] as RequireTestCompanionOptions | undefined;

  return {
    enforceIn: normalizeList(rawOptions?.enforceIn, DEFAULT_ENFORCE_IN),
    ignorePatterns: normalizeList(
      rawOptions?.ignorePatterns,
      DEFAULT_IGNORE_PATTERNS,
    ),
    testSuffixes: normalizeList(
      rawOptions?.testSuffixes,
      DEFAULT_TEST_SUFFIXES,
    ),
  };
};

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
  path.relative(cwd(), filename).split(path.sep).join("/");

/**
 * Normalizes normalizePattern.
 * @param pattern Input pattern value.
 * @returns Return value output.
 * @example
 * ```typescript
 * normalizePattern();
 * ```
 */
const normalizePattern = (pattern: string): string =>
  pattern.startsWith("/") ? `**${pattern}` : pattern;

/**
 * Checks isPathMatch.
 * @param filename Input filename value.
 * @param patterns Input patterns value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isPathMatch();
 * ```
 */
const isPathMatch = (filename: string, patterns: string[]): boolean => {
  if (patterns.length === 0) {
    return false;
  }

  const relativePath = normalizeRelativePath(filename);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return false;
  }

  return patterns.some((pattern) =>
    minimatch(relativePath, normalizePattern(pattern), { dot: true }),
  );
};

export {
  getOptions,
  isLintableFilename,
  isPathMatch,
  isTypeScriptFile,
  type RequireTestCompanionState,
  TYPESCRIPT_EXTENSION,
};
