import type * as ts from "typescript";

import {
  isMethodDeclaration,
  isMethodSignature,
  isParameter,
  isPropertyDeclaration,
  isPropertySignature,
  SignatureKind,
  SymbolFlags,
} from "typescript";

import type { OuterCastContext } from "./types";

/** Minimal symbol-flag shape used by unit-test doubles. */
interface SymbolWithOptionalFlags {
  /** Optional numeric flag bitset supplied by test doubles. */
  flags?: number;

  /** Optional getter used by real TypeScript symbols. */
  getFlags?: () => number;
}

/**
 * Selects a single object-like branch from a union when one exists.
 * @param checker TypeScript type checker instance.
 * @param unionType Union type to inspect.
 * @returns The single object-like branch when the union is unambiguous.
 * @example
 * ```typescript
 * const branch = getSingleUnionObjectLikeType(checker, unionType);
 * ```
 */
function getSingleUnionObjectLikeType(
  checker: ts.TypeChecker,
  unionType: ts.UnionType,
): ts.Type | undefined {
  const objectLikeTypes = unionType.types.filter((type) =>
    hasObjectShape(checker, type),
  );

  return objectLikeTypes.length === 1 ? objectLikeTypes[0] : void 0;
}

/**
 * Detects whether a TypeScript type has an object-like surface.
 * @param checker TypeScript type checker instance.
 * @param targetType Candidate target type.
 * @returns True when the type exposes properties or callable signatures.
 * @example
 * ```typescript
 * const objectLike = hasObjectShape(checker, targetType);
 * ```
 */
function hasObjectShape(checker: ts.TypeChecker, targetType: ts.Type): boolean {
  return (
    checker.getPropertiesOfType(targetType).length > 0 ||
    checker.getSignaturesOfType(targetType, SignatureKind.Call).length > 0 ||
    checker.getSignaturesOfType(targetType, SignatureKind.Construct).length > 0
  );
}

/**
 * Checks whether a TypeScript symbol flag is present without using bitwise syntax.
 * @param flags Symbol flag bitset to inspect.
 * @param flag Specific flag to test.
 * @returns True when the flag is present in the bitset.
 * @example
 * ```typescript
 * const hasOptionalFlag = hasSymbolFlag(SymbolFlags.Optional, SymbolFlags.Optional);
 * ```
 */
function hasSymbolFlag(flags: number, flag: SymbolFlags): boolean {
  return Math.trunc(flags / flag) % 2 === 1;
}

/**
 * Determines whether a symbol represents an optional object property.
 * @param propertySymbol Property symbol being checked.
 * @returns True when a declaration marks the property as optional.
 * @example
 * ```typescript
 * const optional = isOptionalSymbol(propertySymbol);
 * ```
 */
function isOptionalSymbol(propertySymbol: ts.Symbol): boolean {
  const flags =
    typeof propertySymbol.getFlags === "function"
      ? propertySymbol.getFlags()
      : ((propertySymbol as SymbolWithOptionalFlags).flags ?? 0);

  if (hasSymbolFlag(flags, SymbolFlags.Optional)) {
    return true;
  }

  const declarations = propertySymbol.getDeclarations() ?? [];

  return declarations.some((declaration) => {
    if (
      isParameter(declaration) ||
      isPropertyDeclaration(declaration) ||
      isPropertySignature(declaration) ||
      isMethodDeclaration(declaration) ||
      isMethodSignature(declaration)
    ) {
      return declaration.questionToken !== void 0;
    }

    return false;
  });
}

/**
 * Determines whether the object literal still needs an outer cast.
 * @param context Data used to decide whether the full object needs casting.
 * @returns True when the full object still needs casting.
 * @example
 * ```typescript
 * const needsOuterCast = isOuterCastRequired(context);
 * ```
 */
function isOuterCastRequired(context: OuterCastContext): boolean {
  const { checker, propertyNames, targetType } = context;

  if (checker.getSignaturesOfType(targetType, SignatureKind.Call).length > 0) {
    return true;
  }

  if (
    checker.getSignaturesOfType(targetType, SignatureKind.Construct).length > 0
  ) {
    return true;
  }

  return checker
    .getPropertiesOfType(targetType)
    .some(
      (propertySymbol) =>
        !isOptionalSymbol(propertySymbol) &&
        !propertyNames.has(propertySymbol.getName()),
    );
}

/**
 * Narrows a target type to the object-like type the fixer can reason about.
 * @param checker TypeScript type checker instance.
 * @param targetType Candidate target type.
 * @returns Object-like type when the target can be normalized safely.
 * @example
 * ```typescript
 * const normalizedType = normalizeObjectLikeType(checker, targetType);
 * ```
 */
function normalizeObjectLikeType(
  checker: ts.TypeChecker,
  targetType: ts.Type | undefined,
): ts.Type | undefined {
  if (targetType === void 0) {
    return void 0;
  }

  const resolvedType = checker.getAwaitedType(targetType);

  if (resolvedType === void 0) {
    return void 0;
  }

  const directObjectLikeType = [resolvedType].find((type) =>
    hasObjectShape(checker, type),
  );

  return (
    directObjectLikeType ??
    (resolvedType.isUnion()
      ? getSingleUnionObjectLikeType(checker, resolvedType)
      : void 0)
  );
}

/**
 * Resolves the factory function's returned object type from its call signatures.
 * @param checker TypeScript type checker instance.
 * @param factoryParameterType Type of the factory callback parameter.
 * @returns Normalized object-like return type when one is available.
 * @example
 * ```typescript
 * const returnType = resolveFactoryReturnType(checker, factoryParameterType);
 * ```
 */
function resolveFactoryReturnType(
  checker: ts.TypeChecker,
  factoryParameterType: ts.Type,
): ts.Type | undefined {
  for (const factorySignature of checker.getSignaturesOfType(
    factoryParameterType,
    SignatureKind.Call,
  )) {
    const normalizedReturnType = normalizeObjectLikeType(
      checker,
      checker.getReturnTypeOfSignature(factorySignature),
    );

    if (normalizedReturnType !== void 0) {
      return normalizedReturnType;
    }
  }

  return void 0;
}

export {
  isOuterCastRequired,
  normalizeObjectLikeType,
  resolveFactoryReturnType,
};
