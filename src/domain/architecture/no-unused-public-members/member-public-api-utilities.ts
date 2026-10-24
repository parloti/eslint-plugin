import path from "node:path";
import * as ts from "typescript";

import type { NoUnusedExportsState } from "../no-unused-exports/types";

import {
  isPublicApiFile,
  isTestFile,
} from "../no-unused-exports/no-unused-exports-options";
import {
  isSameSymbol,
  resolveCanonicalSymbol,
  sourceFileExportsSymbol,
} from "../no-unused-exports/no-unused-exports-symbol-utilities";

/**
 * Checks whether a symbol is nested within an exported API type.
 * @param type Type shape of an exported value or type.
 * @param targetSymbol Symbol being searched for.
 * @param checker TypeScript type checker.
 * @param location Node used to resolve property types.
 * @param visitedTypes Types already checked on this search path.
 * @param depth Remaining nested property depth.
 * @returns True when the target occurs in the exported type shape.
 * @example
 * ```typescript
 * const exposed = typeContainsSymbol(type, member, checker, sourceFile, new Set(), 2);
 * ```
 */
const typeContainsSymbol = (
  type: ts.Type,
  targetSymbol: ts.Symbol,
  checker: ts.TypeChecker,
  location: ts.Node,
  visitedTypes: Set<ts.Type>,
  depth: number,
): boolean => {
  if (depth < 0 || visitedTypes.has(type)) {
    return false;
  }

  visitedTypes.add(type);

  if (type.isUnionOrIntersection()) {
    return type.types.some((constituent) =>
      typeContainsSymbol(
        constituent,
        targetSymbol,
        checker,
        location,
        visitedTypes,
        depth,
      ),
    );
  }

  for (const property of checker.getPropertiesOfType(type)) {
    if (
      isSameSymbol(resolveCanonicalSymbol(property, checker), targetSymbol) ||
      typeContainsSymbol(
        checker.getTypeOfSymbolAtLocation(property, location),
        targetSymbol,
        checker,
        location,
        visitedTypes,
        depth - 1,
      )
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Checks whether a member is reachable from a configured public API export.
 * @param program TypeScript project program.
 * @param state Normalized public API and test patterns.
 * @param repoRoot Root directory used for glob matching.
 * @param memberSymbol Member symbol being checked.
 * @returns True when an API export exposes the member.
 * @example
 * ```typescript
 * const exposed = isPublicApiMember(program, state, repoRoot, memberSymbol);
 * ```
 */
const isPublicApiMember = (
  program: ts.Program,
  state: NoUnusedExportsState,
  repoRoot: string,
  memberSymbol: ts.Symbol,
): boolean => {
  const checker = program.getTypeChecker();
  const targetSymbol = resolveCanonicalSymbol(memberSymbol, checker);
  const normalizedRoot = path.resolve(repoRoot);

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    const filename = path.resolve(sourceFile.fileName);

    if (
      !isPublicApiFile(filename, state, normalizedRoot) ||
      isTestFile(filename, state, normalizedRoot)
    ) {
      continue;
    }

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

    if (moduleSymbol === void 0) {
      continue;
    }

    for (const exportedSymbol of checker.getExportsOfModule(moduleSymbol)) {
      const canonicalExport = resolveCanonicalSymbol(exportedSymbol, checker);

      if (
        isSameSymbol(canonicalExport, targetSymbol) ||
        typeContainsSymbol(
          checker.getTypeOfSymbolAtLocation(canonicalExport, sourceFile),
          targetSymbol,
          checker,
          sourceFile,
          new Set(),
          3,
        ) ||
        ((canonicalExport.flags & ts.SymbolFlags.Type) !== 0 &&
          typeContainsSymbol(
            checker.getDeclaredTypeOfSymbol(canonicalExport),
            targetSymbol,
            checker,
            sourceFile,
            new Set(),
            3,
          ))
      ) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Checks whether a host is exported from a configured public API file.
 * @param program TypeScript project program.
 * @param state Normalized public API and test patterns.
 * @param repoRoot Root directory used for glob matching.
 * @param hostSymbol Host declaration symbol.
 * @returns True when the host is exposed by a non-test API file.
 * @example
 * ```typescript
 * const isPublic = isPublicApiHost(program, state, repoRoot, hostSymbol);
 * ```
 */
const isPublicApiHost = (
  program: ts.Program,
  state: NoUnusedExportsState,
  repoRoot: string,
  hostSymbol: ts.Symbol | undefined,
): boolean => {
  if (hostSymbol === void 0) {
    return false;
  }

  const checker = program.getTypeChecker();
  const normalizedRoot = path.resolve(repoRoot);
  const canonicalHost = resolveCanonicalSymbol(hostSymbol, checker);

  return program.getSourceFiles().some((sourceFile) => {
    if (sourceFile.isDeclarationFile) {
      return false;
    }

    const filename = path.resolve(sourceFile.fileName);

    return (
      isPublicApiFile(filename, state, normalizedRoot) &&
      !isTestFile(filename, state, normalizedRoot) &&
      sourceFileExportsSymbol(sourceFile, checker, canonicalHost)
    );
  });
};

export { isPublicApiHost, isPublicApiMember };
