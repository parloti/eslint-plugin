import type { Rule } from "eslint";

import path from "node:path";

import type { ConsistentBarrelFilesState } from "./consistent-barrel-files-options";

import { getDirectoryBarrelState } from "./barrel-file-utilities";
import { shouldLintFile } from "./consistent-barrel-files-options";

/**
 * Builds the enforcement listener for a file's directory.
 * @param context Rule execution context.
 * @param filename Filename being linted.
 * @param options Normalized rule options.
 * @returns The directory-level rule listener.
 * @example
 * ```typescript
 * const listener = buildListenerForDirectory(context, filename, state);
 * ```
 */
const buildListenerForDirectory = (
  context: Rule.RuleContext,
  filename: string,
  options: ConsistentBarrelFilesState,
): Rule.RuleListener => {
  const directory = path.dirname(filename);
  const directoryState = getDirectoryBarrelState(
    directory,
    options.allowedNamesSet,
  );

  if (
    !directoryState.hasNonBarrelModuleFile ||
    directoryState.hasAllowedBarrelFile
  ) {
    return {};
  }

  return buildMissingListener(context, options.allowedNames);
};

/**
 * Builds the listener that forbids barrel files when enforcement is disabled.
 * @param context Rule execution context.
 * @param filename Filename being linted.
 * @param options Normalized rule options.
 * @returns The forbidden-barrel listener.
 * @example
 * ```typescript
 * const listener = buildForbiddenListener(context, filename, state);
 * ```
 */
const buildForbiddenListener = (
  context: Rule.RuleContext,
  filename: string,
  options: ConsistentBarrelFilesState,
): Rule.RuleListener => {
  const directory = path.dirname(filename);
  const directoryState = getDirectoryBarrelState(
    directory,
    options.allowedNamesSet,
  );

  if (
    !directoryState.hasNonBarrelModuleFile ||
    directoryState.primaryAllowedBarrelFile === void 0
  ) {
    return {};
  }

  return buildForbiddenListenerFromName(
    context,
    directoryState.primaryAllowedBarrelFile,
  );
};

/**
 * Builds the listener that reports a forbidden barrel filename.
 * @param context Rule execution context.
 * @param forbiddenName Barrel filename to report.
 * @returns The forbidden-barrel listener.
 * @example
 * ```typescript
 * const listener = buildForbiddenListenerFromName(context, "index.ts");
 * ```
 */
const buildForbiddenListenerFromName = (
  context: Rule.RuleContext,
  forbiddenName: string,
): Rule.RuleListener => {
  return {
    Program(node): void {
      context.report({
        data: { name: forbiddenName },
        messageId: "forbiddenBarrel",
        node,
      });
    },
  };
};

/**
 * Builds the listener that reports missing barrel files.
 * @param context Rule execution context.
 * @param names Allowed barrel names to report.
 * @returns The missing-barrel listener.
 * @example
 * ```typescript
 * const listener = buildMissingListener(context, ["index"]);
 * ```
 */
const buildMissingListener = (
  context: Rule.RuleContext,
  names: string[],
): Rule.RuleListener => {
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
 * Builds the listener used for a single file evaluation.
 * @param context Rule execution context.
 * @param filename Filename being linted.
 * @param options Normalized rule options.
 * @returns The file-specific rule listener.
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
  const { allowedNames, enforce } = options;

  if (!shouldLintFile(filename, allowedNames)) {
    return {};
  }

  if (!enforce) {
    return buildForbiddenListener(context, filename, options);
  }

  return buildListenerForDirectory(context, filename, options);
};

export { buildListenerForFile };
