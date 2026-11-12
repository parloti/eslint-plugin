import * as ts from "typescript";

import type { NoUnusedExportsState } from "../no-unused-exports/types";
import type { PublicMember } from "./member-declaration-utilities";
import type { MemberAnalysisScope } from "./member-scope-utilities";

import {
  isSameSymbol,
  resolveCanonicalSymbol,
} from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { collectHeritageMemberSymbols } from "./member-contract-utilities";
import { getUsageType } from "./member-operation-type-utilities";
import { hasIndexedSymbol } from "./member-symbol-index-utilities";
import { getProductionUsageIndex } from "./member-usage-index-utilities";
import {
  getReferencedMemberSymbol,
  isStructuralPropertyRead,
} from "./member-usage-reference-utilities";

/** Framework-specific member usage detector supplied by an opt-in adapter. */
type MemberUsageAdapter = (
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  member: PublicMember,
) => boolean;

/**
 * Checks direct, structural, and adapter references before operation analysis.
 * @param program TypeScript project program.
 * @param state Normalized public API and test patterns.
 * @param repoRoot Root directory used for glob matching.
 * @param member Member whose production usage is being checked.
 * @param scope Owning folder and its eligible production files.
 * @param usageAdapters Optional framework-specific usage detectors.
 * @returns True when production code references the member.
 * @example
 * ```typescript
 * const used = hasProductionReference(program, state, repoRoot, member, scope);
 * ```
 */
const hasProductionReference = (
  program: ts.Program,
  state: NoUnusedExportsState,
  repoRoot: string,
  member: PublicMember,
  scope: MemberAnalysisScope,
  usageAdapters: readonly MemberUsageAdapter[] = [],
): boolean => {
  const checker = program.getTypeChecker();
  const index = getProductionUsageIndex(program, state, repoRoot, scope);
  const canonicalMember = resolveCanonicalSymbol(member.memberSymbol, checker);
  if (hasIndexedSymbol(index.symbols, canonicalMember)) {
    return true;
  }
  const relatedSymbols = getRelatedMemberSymbols(member, scope, checker);

  return (
    relatedSymbols.some((symbol) => hasIndexedSymbol(index.symbols, symbol)) ||
    (index.references.get(member.memberName) ?? []).some((node) =>
      isStructuralPropertyRead(node, checker, member),
    ) ||
    (index.deferredReferences.get(member.memberName) ?? []).some((node) => {
      const symbol = getReferencedMemberSymbol(node, checker, program);
      return (
        symbol !== void 0 &&
        relatedSymbols.some((related) => isSameSymbol(related, symbol))
      );
    }) ||
    (usageAdapters.length > 0 &&
      index.sourceFiles.some((sourceFile) =>
        usageAdapters.some((adapter) => adapter(sourceFile, checker, member)),
      ))
  );
};

/**
 * Collects declaration identities accepted by direct and computed reads.
 * @param member Candidate whose contracts are requested.
 * @param scope Eligible owner-local declarations.
 * @param checker Active semantic checker.
 * @returns Canonical member, heritage, and contextual declaration symbols.
 * @example
 * ```typescript
 * const symbols = getRelatedMemberSymbols(member, scope, checker);
 * ```
 */
const getRelatedMemberSymbols = (
  member: PublicMember,
  scope: MemberAnalysisScope,
  checker: ts.TypeChecker,
): ts.Symbol[] => {
  const relatedSymbols = [
    resolveCanonicalSymbol(member.memberSymbol, checker),
    ...collectHeritageMemberSymbols(scope, checker, member).map((symbol) =>
      resolveCanonicalSymbol(symbol, checker),
    ),
  ];
  const variableDeclaration = ts.isVariableDeclaration(member.hostDeclaration)
    ? member.hostDeclaration
    : void 0;

  if (variableDeclaration !== void 0) {
    const declaredType = getUsageType(variableDeclaration.name, checker);
    const declaredMember = checker.getPropertyOfType(
      declaredType,
      member.memberName,
    );

    if (
      declaredMember !== void 0 &&
      relatedSymbols.every((symbol) => !isSameSymbol(symbol, declaredMember))
    ) {
      relatedSymbols.push(resolveCanonicalSymbol(declaredMember, checker));
    }
  }

  return relatedSymbols;
};

export { getRelatedMemberSymbols, hasProductionReference };
export type { MemberUsageAdapter };
