import type { Rule } from "eslint";

import fs from "node:fs";
import path from "node:path";

import type { ConsistentBarrelFilesState } from "./consistent-barrel-files-options";

import { shouldLintFile } from "./consistent-barrel-files-options";

/** Cache to avoid repeated directory scans. */
const directoryCache = new Map<string, boolean>();

/** Tracks cache keys already reported as missing barrels. */
const reportedMissing = new Set<string>();

/**
 * Checks hasBarrelFile.
 * @param directory Input directory value.
 * @param names Input names value.
 * @returns Return value output.
 * @example
 * ```typescript
 * hasBarrelFile();
 * ```
 */
const hasBarrelFile = (directory: string, names: string[]): boolean =>
  names.some((name) => fs.existsSync(path.join(directory, name)));

/**
 * Gets cached barrel presence or computes it.
 * @param cacheKey Cache key for the lookup.
 * @param directory Directory to scan.
 * @param names Allowed barrel filenames.
 * @returns True when a barrel file exists.
 * @example
 * ```typescript
 * const exists = getCachedBarrelPresence(key, directory, names);
 * ```
 */
const getCachedBarrelPresence = (
  cacheKey: string,
  directory: string,
  names: string[],
): boolean => {
  const cached = directoryCache.get(cacheKey);

  if (cached !== void 0) {
    return cached;
  }

  const hasBarrel = hasBarrelFile(directory, names);

  directoryCache.set(cacheKey, hasBarrel);

  return hasBarrel;
};

/**
 * Builds a listener for a directory when enforcement is enabled.
 * @param context Rule execution context.
 * @param directory Directory to inspect.
 * @param options Normalized rule options.
 * @returns The rule listener for the directory.
 * @example
 * ```typescript
 * const listener = buildListenerForDirectory(context, dir, state);
 * ```
 */
const buildListenerForDirectory = (
  context: Rule.RuleContext,
  directory: string,
  options: ConsistentBarrelFilesState,
): Rule.RuleListener => {
  const cacheKey = `${directory}|${options.namesKey}`;

  if (getCachedBarrelPresence(cacheKey, directory, options.names)) {
    return {};
  }

  return buildMissingListener(context, options.names, cacheKey);
};

/**
 * Builds a listener for forbidden barrel files.
 * @param context Rule execution context.
 * @param basename Filename being checked.
 * @param namesSet Allowed barrel names.
 * @returns The rule listener for forbidden barrels.
 * @example
 * ```typescript
 * const listener = buildForbiddenListener(context, basename, names);
 * ```
 */
const buildForbiddenListener = (
  context: Rule.RuleContext,
  basename: string,
  namesSet: ReadonlySet<string>,
): Rule.RuleListener => {
  if (!namesSet.has(basename)) {
    return {};
  }

  return {
    Program(node): void {
      context.report({
        data: { name: basename },
        messageId: "forbiddenBarrel",
        node,
      });
    },
  };
};

/**
 * Builds a listener that reports missing barrel files.
 * @param context Rule execution context.
 * @param names Allowed barrel names.
 * @param cacheKey Cache key for the directory.
 * @returns The rule listener for missing barrels.
 * @example
 * ```typescript
 * const listener = buildMissingListener(context, names, cacheKey);
 * ```
 */
const buildMissingListener = (
  context: Rule.RuleContext,
  names: string[],
  cacheKey: string,
): Rule.RuleListener => {
  if (reportedMissing.has(cacheKey)) {
    return {};
  }

  reportedMissing.add(cacheKey);

  return {
    Program(node): void {
      context.report({
        data: { names: names.join(", ") },
        messageId: "missingBarrel",
        node,
      });
    },
  };
};

/**
 * Builds a listener for a specific file.
 * @param context Rule execution context.
 * @param filename Absolute filename.
 * @param options Normalized rule options.
 * @returns The rule listener for the file.
 * @example
 * ```typescript
 * const listener = buildListenerForFile(context, filename, state);
 * ```
 */
const buildListenerForFile = (
  context: Rule.RuleContext,
  filename: string,
  options: ConsistentBarrelFilesState,
): Rule.RuleListener => {
  const { enforce, folders, names, namesSet } = options;

  if (!shouldLintFile(filename, folders, names)) {
    return {};
  }

  const basename = path.basename(filename);

  if (!enforce) {
    return buildForbiddenListener(context, basename, namesSet);
  }

  return buildListenerForDirectory(context, path.dirname(filename), options);
};

export { buildListenerForFile };
