import type {
  ModuleSpecifierParts,
  PackageSubpathImportAlias,
} from "./package-subpath-import-types";

/**
 * Splits a module specifier into its path and suffix portions.
 * @param source Module specifier text.
 * @returns Path and preserved query/fragment suffix.
 * @example
 * ```typescript
 * const parts = splitModuleSpecifier("./feature?raw");
 * ```
 */
const splitModuleSpecifier = (source: string): ModuleSpecifierParts => {
  const queryIndex = source.indexOf("?");
  const hashIndex = source.indexOf("#");
  const endIndexCandidates = [queryIndex, hashIndex].filter(
    (index) => index >= 0,
  );
  const endIndex =
    endIndexCandidates.length === 0
      ? source.length
      : Math.min(...endIndexCandidates);

  return {
    pathPart: source.slice(0, endIndex),
    suffix: source.slice(endIndex),
  };
};

/**
 * Matches one package-relative POSIX path against a normalized alias.
 * @param alias Normalized package.json alias.
 * @param packagePath Package-relative POSIX path.
 * @returns Alias specifier or undefined when the path does not match.
 * @example
 * ```typescript
 * const aliasSpecifier = matchPackageSubpathImportAlias(alias, "src/feature");
 * ```
 */
const matchPackageSubpathImportAlias = (
  alias: PackageSubpathImportAlias,
  packagePath: string,
): string | undefined => {
  if (!alias.isPattern) {
    return alias.targetPrefix === packagePath ? alias.aliasPrefix : void 0;
  }

  const { aliasPrefix, aliasSuffix, targetPrefix, targetSuffix } = alias;

  if (
    packagePath.length < targetPrefix.length + targetSuffix.length ||
    !packagePath.startsWith(targetPrefix) ||
    !packagePath.endsWith(targetSuffix)
  ) {
    return void 0;
  }

  const wildcardValue = packagePath.slice(
    targetPrefix.length,
    packagePath.length - targetSuffix.length,
  );

  return `${aliasPrefix}${wildcardValue}${aliasSuffix}`;
};

export { matchPackageSubpathImportAlias, splitModuleSpecifier };
