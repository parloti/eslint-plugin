import type { AST } from "eslint";

import type { NoReexportsOutsideBarrelsOptions } from "./types";

import {
  isBarrelFile as isBarrelModuleFile,
  isLintableModuleFile,
  normalizeAllowedBarrelNames,
} from "./barrel-file-utilities";

/** Type definition for rule data. */
interface NoReexportsOutsideBarrelsState {
  /** AllowedBarrelNames field value. */
  allowedBarrelNames: string[];

  /** AllowedBarrelNamesSet field value. */
  allowedBarrelNamesSet: Set<string>;
}

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
  const allowedBarrelNames = normalizeAllowedBarrelNames(
    rawOptions?.allowedBarrelNames,
  );

  return {
    allowedBarrelNames,
    allowedBarrelNamesSet: new Set(allowedBarrelNames),
  };
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
  isLintableModuleFile(filename);

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
  return isLintableFilename(filename) && options.allowedBarrelNames.length > 0;
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
  return isBarrelModuleFile(filename, options.allowedBarrelNamesSet);
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
