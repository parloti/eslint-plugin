import type { Rule } from "eslint";

import path from "node:path";

import type { ConsistentBarrelFilesState } from "./consistent-barrel-files-options";

import { getDirectoryBarrelState, isBarrelFile } from "./barrel-file-utilities";
import { shouldLintFile } from "./consistent-barrel-files-options";

/**
 * Builds a listener for a directory when enforcement is enabled.
 * @param context Rule execution context.
 * @param directory Directory to inspect.
 * @param filename
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
  filename: string,
  options: ConsistentBarrelFilesState,
): Rule.RuleListener => {
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

  if (directoryState.primaryNonBarrelModuleFile !== path.basename(filename)) {
    return {};
  }

  return buildMissingListener(context, options.allowedNames);
};

/**
 * Builds a listener for forbidden barrel files.
 * @param context Rule execution context.
 * @param basename Filename being checked.
 * @param namesSet Allowed barrel names.
 * @param filename
 * @param options
 * @returns The rule listener for forbidden barrels.
 * @example
 * ```typescript
 * const listener = buildForbiddenListener(context, basename, names);
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
    !isBarrelFile(filename, options.allowedNamesSet)
  ) {
    return {};
  }

  return {
    Program(node): void {
      context.report({
        data: { name: path.basename(filename) },
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
 * @returns The rule listener for missing barrels.
 * @example
 * ```typescript
 * const listener = buildMissingListener(context, names);
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
  const { allowedNames, enforce } = options;

  if (!shouldLintFile(filename, allowedNames)) {
    return {};
  }

  if (!enforce) {
    return buildForbiddenListener(context, filename, options);
  }

  return buildListenerForDirectory(
    context,
    path.dirname(filename),
    filename,
    options,
  );
};

export { buildListenerForFile };
