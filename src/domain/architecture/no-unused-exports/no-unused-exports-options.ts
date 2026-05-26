import { minimatch } from "minimatch";
import path from "node:path";

import type { NoUnusedExportsOptions, NoUnusedExportsState } from "./types";

/** Default allowlist where unused exports are intentionally allowed. */
const DEFAULT_ALLOW_IN_FILES = [
  "**/src/index.ts",
  "**/test-util/**/*.ts",
  "tests/support/**/*.ts",
] as const;

/** Default glob patterns used to classify test files. */
const DEFAULT_TEST_FILE_PATTERNS = ["**/*.{test,spec,e2e}.ts"] as const;

/** Default file pattern used to scope analysis to source files. */
const DEFAULT_LINTABLE_FILE_PATTERN = "**/src/**/*.ts";

/**
 * Checks whether one path is absolute and non-empty.
 * @param filename Input filename.
 * @returns True when the path is absolute and non-empty.
 * @example
 * ```typescript
 * const ok = isAbsolutePath("/repo/src/feature.ts");
 * ```
 */
const isAbsolutePath = (filename: string): boolean =>
  filename.length > 0 && path.isAbsolute(filename);

/**
 * Checks whether one file path is lintable.
 * @param filename Input filename.
 * @returns True when the path is absolute and matches source-file scope.
 * @example
 * ```typescript
 * const ok = isLintableFilename("/repo/src/feature.ts");
 * ```
 */
const isLintableFilename = (filename: string): boolean => {
  if (!isAbsolutePath(filename)) {
    return false;
  }

  const normalizedPath = filename.split(path.sep).join("/");

  return minimatch(normalizedPath, DEFAULT_LINTABLE_FILE_PATTERN, {
    dot: true,
  });
};

/**
 * Normalizes one rule option value into a string list.
 * @param value Raw option value.
 * @param defaults Default values.
 * @returns Normalized list.
 * @example
 * ```typescript
 * const list = normalizeStringList(["src/**"], ["src/**"]);
 * ```
 */
const normalizeStringList = (
  value: unknown,
  defaults: readonly string[],
): string[] => {
  if (Array.isArray(value)) {
    const normalized = value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    return normalized.length > 0 ? normalized : [...defaults];
  }

  return [...defaults];
};

/**
 * Builds normalized options from raw rule options.
 * @param options Raw rule options.
 * @returns Normalized options state.
 * @example
 * ```typescript
 * const state = getOptions([{}]);
 * ```
 */
const getOptions = (options: readonly unknown[]): NoUnusedExportsState => {
  const raw = options[0] as NoUnusedExportsOptions | undefined;

  return {
    allowInFiles: normalizeStringList(
      raw?.allowInFiles,
      DEFAULT_ALLOW_IN_FILES,
    ),
    testFilePatterns: normalizeStringList(
      raw?.testFilePatterns,
      DEFAULT_TEST_FILE_PATTERNS,
    ),
  };
};

/**
 * Converts an absolute filename into a repo-root-relative POSIX path.
 * @param filename Absolute filename.
 * @param repoRoot Absolute repository root.
 * @returns Repo-relative POSIX path or undefined when outside repo root.
 * @example
 * ```typescript
 * const relativePath = toRepoRelativePosixPath("/repo/src/feature.ts", "/repo");
 * ```
 */
const toRepoRelativePosixPath = (
  filename: string,
  repoRoot: string,
): string | undefined => {
  if (!isAbsolutePath(filename) || !isAbsolutePath(repoRoot)) {
    return void 0;
  }

  const relativePath = path.relative(repoRoot, filename);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return void 0;
  }

  return relativePath.split(path.sep).join("/");
};

/**
 * Checks whether one filename matches any glob pattern.
 * @param filename Absolute filename.
 * @param patterns Glob patterns.
 * @param repoRoot Absolute repository root.
 * @returns True when any pattern matches.
 * @example
 * ```typescript
 * const match = matchesAnyPattern("/repo/src/index.ts", ["src-pattern"], "/repo");
 * ```
 */
const matchesAnyPattern = (
  filename: string,
  patterns: string[],
  repoRoot: string,
): boolean => {
  const relativePath = toRepoRelativePosixPath(filename, repoRoot);

  if (relativePath === void 0 || patterns.length === 0) {
    return false;
  }

  return patterns.some((pattern) =>
    minimatch(relativePath, pattern, { dot: true }),
  );
};

/**
 * Checks whether unused exports are allowed in the current file.
 * @param filename Absolute filename.
 * @param state Normalized options.
 * @param repoRoot Absolute repository root.
 * @returns True when the file is allowlisted.
 * @example
 * ```typescript
 * const allowed = isAllowlistedFile("/repo/src/index.ts", state, "/repo");
 * ```
 */
const isAllowlistedFile = (
  filename: string,
  state: NoUnusedExportsState,
  repoRoot: string,
): boolean => matchesAnyPattern(filename, state.allowInFiles, repoRoot);

/**
 * Checks whether one file should be treated as a test file.
 * @param filename Absolute filename.
 * @param state Normalized options.
 * @param repoRoot Absolute repository root.
 * @returns True when the file path matches a test pattern.
 * @example
 * ```typescript
 * const testFile = isTestFile("/repo/tests/e2e/demo.ts", state, "/repo");
 * ```
 */
const isTestFile = (
  filename: string,
  state: NoUnusedExportsState,
  repoRoot: string,
): boolean => matchesAnyPattern(filename, state.testFilePatterns, repoRoot);

export {
  DEFAULT_ALLOW_IN_FILES,
  DEFAULT_TEST_FILE_PATTERNS,
  getOptions,
  isAllowlistedFile,
  isLintableFilename,
  isTestFile,
};
