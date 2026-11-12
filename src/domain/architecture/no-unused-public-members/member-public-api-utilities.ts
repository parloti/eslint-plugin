import path from "node:path";
import * as ts from "typescript";

import type { NoUnusedExportsState } from "../no-unused-exports/types";
import type { SymbolIndex } from "./member-symbol-index-utilities";

import { resolveCanonicalSymbol } from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { canSourceReachMember } from "./member-api-reachability-utilities";
import { hasTypeMember } from "./member-api-type-utilities";
import {
  getMemberProgramCache,
  setMemberProgramCache,
} from "./member-program-cache-utilities";
import { getMemberApiSourceFiles } from "./member-scope-utilities";
import {
  addIndexedSymbol,
  hasIndexedSymbol,
} from "./member-symbol-index-utilities";

interface PublicApiExport {
  sourceFile: ts.SourceFile;
  symbol: ts.Symbol;
}

interface PublicApiIndex {
  exports: PublicApiExport[];
  hosts: SymbolIndex;
  members: SymbolIndex;
  nonApiMembers: SymbolIndex;
}

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
  const cached = getMemberProgramCache(
    program,
    "public-api-index",
    cacheKey,
  ) as PublicApiIndex | undefined;
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

  for (const sourceFile of getMemberApiSourceFiles(
    program,
    state,
    normalizedRoot,
  )) {
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

  setMemberProgramCache(program, "public-api-index", cacheKey, index);
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
  for (const publicApiExport of index.exports) {
    const { sourceFile, symbol } = publicApiExport;

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
      hasTypeMember(
        checker.getTypeOfSymbolAtLocation(symbol, sourceFile),
        targetSymbol,
        program,
        sourceFile,
      ) ||
      ((symbol.flags & ts.SymbolFlags.Type) !== 0 &&
        hasTypeMember(
          checker.getDeclaredTypeOfSymbol(symbol),
          targetSymbol,
          program,
          sourceFile,
        ))
    ) {
      addIndexedSymbol(index.members, targetSymbol);
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
