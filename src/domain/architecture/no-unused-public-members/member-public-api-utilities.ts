import path from "node:path";
import * as ts from "typescript";

import type { NoUnusedExportsState } from "../no-unused-exports/types";
import type { SymbolIndex } from "./member-symbol-index-utilities";

import {
  isPublicApiFile,
  isTestFile,
} from "../no-unused-exports/no-unused-exports-options";
import { resolveCanonicalSymbol } from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { canSourceReachMember } from "./member-api-reachability-utilities";
import { collectTypeSymbols } from "./member-api-type-utilities";
import {
  addIndexedSymbol,
  hasIndexedSymbol,
} from "./member-symbol-index-utilities";

interface PublicApiIndex {
  exports: { sourceFile: ts.SourceFile; symbol: ts.Symbol }[];
  hosts: SymbolIndex;
  members: SymbolIndex;
  nonApiMembers: SymbolIndex;
}

const publicApiIndexes = new WeakMap<ts.Program, Map<string, PublicApiIndex>>();

const getPublicApiIndex = (
  program: ts.Program,
  state: NoUnusedExportsState,
  repoRoot: string,
): PublicApiIndex => {
  const cacheKey = JSON.stringify([
    path.resolve(repoRoot),
    state.publicApiFiles,
    state.testFilePatterns,
  ]);
  let indexes = publicApiIndexes.get(program);
  const cached = indexes?.get(cacheKey);
  if (cached !== void 0) {
    return cached;
  }

  const checker = program.getTypeChecker();
  const normalizedRoot = path.resolve(repoRoot);
  const index: PublicApiIndex = {
    exports: [],
    hosts: new Set(),
    members: new Set(),
    nonApiMembers: new Set(),
  };

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

      addIndexedSymbol(index.hosts, canonicalExport);
      addIndexedSymbol(index.members, canonicalExport);
      index.exports.push({ sourceFile, symbol: canonicalExport });
    }
  }

  if (indexes === void 0) {
    indexes = new Map();
    publicApiIndexes.set(program, indexes);
  }
  indexes.set(cacheKey, index);
  return index;
};

const isIndexedPublicApiMember = (
  index: PublicApiIndex,
  program: ts.Program,
  targetSymbol: ts.Symbol,
): boolean => {
  if (hasIndexedSymbol(index.members, targetSymbol)) {
    return true;
  }
  if (hasIndexedSymbol(index.nonApiMembers, targetSymbol)) {
    return false;
  }
  const checker = program.getTypeChecker();
  for (const { sourceFile, symbol } of index.exports) {
    const declarations = symbol.declarations ?? [];
    if (
      !canSourceReachMember(sourceFile, targetSymbol, program) ||
      (declarations.length > 0 &&
        declarations.every(
          (declaration) =>
            !canSourceReachMember(
              declaration.getSourceFile(),
              targetSymbol,
              program,
            ),
        ))
    ) {
      continue;
    }
    if (
      collectTypeSymbols(
        checker.getTypeOfSymbolAtLocation(symbol, sourceFile),
        index.members,
        targetSymbol,
        checker,
        sourceFile,
        new Set(),
        6,
      ) ||
      ((symbol.flags & ts.SymbolFlags.Type) !== 0 &&
        collectTypeSymbols(
          checker.getDeclaredTypeOfSymbol(symbol),
          index.members,
          targetSymbol,
          checker,
          sourceFile,
          new Set(),
          6,
        ))
    ) {
      return true;
    }
  }
  addIndexedSymbol(index.nonApiMembers, targetSymbol);
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
): boolean =>
  isIndexedPublicApiMember(
    getPublicApiIndex(program, state, repoRoot),
    program,
    resolveCanonicalSymbol(memberSymbol, program.getTypeChecker()),
  );

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
): boolean =>
  hostSymbol !== void 0 &&
  hasIndexedSymbol(
    getPublicApiIndex(program, state, repoRoot).hosts,
    resolveCanonicalSymbol(hostSymbol, program.getTypeChecker()),
  );

export { isPublicApiHost, isPublicApiMember };
