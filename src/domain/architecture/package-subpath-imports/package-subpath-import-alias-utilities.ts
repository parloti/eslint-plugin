import path from "node:path";

import type {
  PackageImportTargetCollection,
  PackageSubpathImportAlias,
  WildcardPatternParts,
} from "./package-subpath-import-types";

/**
 * Checks whether a value is a non-array object record.
 * @param value Candidate value.
 * @returns True when the value is a non-array object.
 * @example
 * ```typescript
 * const record = isRecord({ imports: {} });
 * ```
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Checks whether one normalized package target is invalid or escapes the package.
 * @param normalized Normalized package-relative target path.
 * @returns True when the target cannot be used safely.
 * @example
 * ```typescript
 * const invalid = isInvalidNormalizedPackageTarget("../outside");
 * ```
 */
const isInvalidNormalizedPackageTarget = (normalized: string): boolean =>
  normalized === "" ||
  normalized === "." ||
  normalized === ".." ||
  normalized.startsWith("../") ||
  path.posix.isAbsolute(normalized);

/**
 * Normalizes one package.json import target to a package-relative POSIX path.
 * @param target Raw package.json import target.
 * @returns Normalized target path or undefined when invalid or escaping.
 * @example
 * ```typescript
 * const target = normalizePackageTargetPath("./src/*");
 * ```
 */
const normalizePackageTargetPath = (target: string): string | undefined => {
  if (!target.startsWith("./")) {
    return void 0;
  }

  const withoutPrefix = target.slice(2).replaceAll("\\", "/");

  if (withoutPrefix.length === 0) {
    return void 0;
  }

  const normalized = path.posix.normalize(withoutPrefix).replace(/\/+$/, "");

  return isInvalidNormalizedPackageTarget(normalized) ? void 0 : normalized;
};

/**
 * Recursively collects normalized targets from one package.json import value.
 * @param value Raw import value from package.json.
 * @param collection Mutable target collection.
 * @example
 * ```typescript
 * const collection = { hasNull: false, invalid: false, targets: new Set<string>() };
 * collectPackageImportTargets("./src/*", collection);
 * ```
 */
const collectPackageImportTargets = (
  value: unknown,
  collection: PackageImportTargetCollection,
): void => {
  if (typeof value === "string") {
    const target = normalizePackageTargetPath(value);

    if (target === void 0) {
      collection.invalid = true;
    } else {
      collection.targets.add(target);
    }

    return;
  }

  if (value === null) {
    collection.hasNull = true;
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectPackageImportTargets(entry, collection);
    }

    return;
  }

  if (isRecord(value)) {
    for (const entry of Object.values(value)) {
      collectPackageImportTargets(entry, collection);
    }

    return;
  }

  collection.invalid = true;
};

/**
 * Counts the wildcard characters in one package import key or target.
 * @param value Key or normalized target to inspect.
 * @returns Number of `*` characters.
 * @example
 * ```typescript
 * const count = countWildcards("#src/*");
 * ```
 */
const countWildcards = (value: string): number => value.split("*").length - 1;

/**
 * Splits one single-wildcard pattern into prefix and suffix parts.
 * @param value Pattern containing exactly one wildcard.
 * @returns Prefix and suffix around the wildcard.
 * @example
 * ```typescript
 * const parts = splitWildcardPattern("#src/*");
 * ```
 */
const splitWildcardPattern = (value: string): WildcardPatternParts => {
  const wildcardIndex = value.indexOf("*");

  return {
    prefix: value.slice(0, wildcardIndex),
    suffix: value.slice(wildcardIndex + 1),
  };
};

/**
 * Builds one normalized alias when its key and target shapes are compatible.
 * @param aliasKey Raw package.json imports key.
 * @param target Normalized package-relative target path.
 * @returns Normalized alias or undefined when malformed.
 * @example
 * ```typescript
 * const alias = createPackageSubpathImportAlias("#src/*", "src/*");
 * ```
 */
const createPackageSubpathImportAlias = (
  aliasKey: string,
  target: string,
): PackageSubpathImportAlias | undefined => {
  const keyWildcardCount = countWildcards(aliasKey);
  const targetWildcardCount = countWildcards(target);

  if (keyWildcardCount === 0 && targetWildcardCount === 0) {
    return {
      aliasPrefix: aliasKey,
      aliasSuffix: "",
      isPattern: false,
      targetPrefix: target,
      targetSuffix: "",
    };
  }

  if (keyWildcardCount !== 1 || targetWildcardCount !== 1) {
    return void 0;
  }

  const aliasParts = splitWildcardPattern(aliasKey);
  const targetParts = splitWildcardPattern(target);

  return {
    aliasPrefix: aliasParts.prefix,
    aliasSuffix: aliasParts.suffix,
    isPattern: true,
    targetPrefix: targetParts.prefix,
    targetSuffix: targetParts.suffix,
  };
};

/**
 * Compares aliases so the most specific package path mapping wins.
 * @param left First alias.
 * @param right Second alias.
 * @returns Negative when left is more specific.
 * @example
 * ```typescript
 * aliases.toSorted(comparePackageSubpathImportAliases);
 * ```
 */
const comparePackageSubpathImportAliases = (
  left: PackageSubpathImportAlias,
  right: PackageSubpathImportAlias,
): number =>
  Number(left.isPattern) - Number(right.isPattern) ||
  right.targetPrefix.length - left.targetPrefix.length ||
  right.targetSuffix.length - left.targetSuffix.length ||
  right.aliasPrefix.length - left.aliasPrefix.length ||
  left.aliasPrefix.localeCompare(right.aliasPrefix) ||
  left.aliasSuffix.localeCompare(right.aliasSuffix);

/**
 * Parses package.json text into normalized `imports` aliases.
 * @param packageJsonText Raw package.json contents.
 * @returns Sorted aliases, or an empty list for invalid or absent imports.
 * @example
 * ```typescript
 * const aliases = parsePackageSubpathImportAliases(packageJsonText);
 * ```
 */
export const parsePackageSubpathImportAliases = (
  packageJsonText: string,
): PackageSubpathImportAlias[] => {
  let parsedPackageJson: unknown;

  try {
    parsedPackageJson = JSON.parse(
      packageJsonText.codePointAt(0) === 0xfe_ff
        ? packageJsonText.slice(1)
        : packageJsonText,
    );
  } catch {
    return [];
  }

  const packageImports = isRecord(parsedPackageJson)
    ? parsedPackageJson["imports"]
    : void 0;

  if (!isRecord(packageImports)) {
    return [];
  }

  const aliases: PackageSubpathImportAlias[] = [];

  for (const [aliasKey, importValue] of Object.entries(packageImports)) {
    if (
      !aliasKey.startsWith("#") ||
      aliasKey.length === 1 ||
      aliasKey.startsWith("#/")
    ) {
      continue;
    }

    const collection: PackageImportTargetCollection = {
      hasNull: false,
      invalid: false,
      targets: new Set<string>(),
    };
    collectPackageImportTargets(importValue, collection);

    if (
      collection.invalid ||
      collection.hasNull ||
      collection.targets.size !== 1
    ) {
      continue;
    }

    const target = [...collection.targets][0];
    const alias =
      target === void 0
        ? void 0
        : createPackageSubpathImportAlias(aliasKey, target);

    if (alias !== void 0) {
      aliases.push(alias);
    }
  }

  return aliases.toSorted(comparePackageSubpathImportAliases);
};
