import * as ts from "typescript";

import type { NoUnusedExportsState } from "../no-unused-exports/types";
import type { PublicMember } from "./member-declaration-utilities";

import {
  isSameSymbol,
  resolveCanonicalSymbol,
} from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { collectHeritageMemberSymbols } from "./member-contract-utilities";
import { hasIndexedSymbol } from "./member-symbol-index-utilities";
import {
  isCallArgumentMember,
  isObjectContractHandoff,
} from "./member-usage-handoff-utilities";
import { getProductionUsageIndex } from "./member-usage-index-utilities";
import { isLocalCallArgumentTransmitted } from "./member-usage-local-flow-utilities";
import {
  isComputedMemberRead,
  isStructuralPropertyRead,
} from "./member-usage-reference-utilities";
import {
  isLocalCallArgumentSerialized,
  isWholeObjectRead,
} from "./member-usage-serialization-utilities";

/** Framework-specific member usage detector supplied by an opt-in adapter. */
type MemberUsageAdapter = (
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  member: PublicMember,
) => boolean;

/**
 * Checks whether a member has a concrete reference in production TypeScript.
 * @param program TypeScript project program.
 * @param state Normalized public API and test patterns.
 * @param repoRoot Root directory used for glob matching.
 * @param member Member whose production usage is being checked.
 * @param usageAdapters Optional framework-specific usage detectors.
 * @returns True when production code references the member.
 * @example
 * ```typescript
 * const used = hasProductionUsage(program, state, repoRoot, member);
 * ```
 */
const hasProductionUsage = (
  program: ts.Program,
  state: NoUnusedExportsState,
  repoRoot: string,
  member: PublicMember,
  usageAdapters: readonly MemberUsageAdapter[] = [],
): boolean => {
  const checker = program.getTypeChecker();
  const index = getProductionUsageIndex(program, state, repoRoot);
  const canonicalMember = resolveCanonicalSymbol(member.memberSymbol, checker);
  if (hasIndexedSymbol(index.symbols, canonicalMember)) {
    return true;
  }
  const relatedSymbols = [
    canonicalMember,
    ...collectHeritageMemberSymbols(program, checker, member).map((symbol) =>
      resolveCanonicalSymbol(symbol, checker),
    ),
  ];
  const variableDeclaration = ts.isVariableDeclaration(member.hostDeclaration)
    ? member.hostDeclaration
    : void 0;

  if (variableDeclaration !== void 0) {
    const declaredType = checker.getTypeAtLocation(variableDeclaration.name);
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

  return (
    relatedSymbols.some((symbol) => hasIndexedSymbol(index.symbols, symbol)) ||
    (index.references.get(member.memberName) ?? []).some((node) =>
      isStructuralPropertyRead(node, checker, member),
    ) ||
    (usageAdapters.length > 0 &&
      index.sourceFiles.some((sourceFile) =>
        usageAdapters.some((adapter) => adapter(sourceFile, checker, member)),
      )) ||
    (index.computedMemberReads.get(member.memberName) ?? []).some((node) =>
      isComputedMemberRead(node, checker, member, relatedSymbols),
    ) ||
    index.dynamicStringMemberReads.some((node) =>
      isComputedMemberRead(node, checker, member, relatedSymbols),
    ) ||
    index.spreads.some((node) =>
      isWholeObjectRead(node, checker, member, program),
    ) ||
    index.jsonStringifyCalls.some(
      (node) =>
        isWholeObjectRead(node, checker, member, program) ||
        isCallArgumentMember(node, checker, member),
    ) ||
    index.localCalls.some(
      (node) =>
        isLocalCallArgumentSerialized(node, checker, member, program) ||
        isLocalCallArgumentTransmitted(node, checker, member),
    ) ||
    index.boundaryCalls.some(
      (node) =>
        isWholeObjectRead(node, checker, member, program) ||
        isCallArgumentMember(node, checker, member),
    ) ||
    index.objectProperties.some((node) =>
      isObjectContractHandoff(node, checker, member),
    )
  );
};

export { hasProductionUsage };
export type { MemberUsageAdapter };
