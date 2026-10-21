import path from "node:path";
import * as ts from "typescript";

import type { NoUnusedExportsState } from "../no-unused-exports/types";
import type { PublicMember } from "./member-declaration-utilities";

import { isTestFile } from "../no-unused-exports/no-unused-exports-options";
import {
  isSameSymbol,
  resolveCanonicalSymbol,
} from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { collectHeritageMemberSymbols } from "./member-contract-utilities";
import {
  isCallArgumentMember,
  isObjectContractHandoff,
} from "./member-usage-handoff-utilities";
import {
  isComputedMemberRead,
  isStructuralPropertyRead,
} from "./member-usage-reference-utilities";

/**
 * Resolves destructured member names or direct reference symbols.
 * @param node Candidate reference node.
 * @param checker TypeScript type checker.
 * @returns Referenced member symbol when available.
 * @example
 * ```typescript
 * const symbol = getUsageSymbol(propertyIdentifier, checker);
 * ```
 */
const getUsageSymbol = (
  node: ts.Node,
  checker: ts.TypeChecker,
): ts.Symbol | undefined => {
  const parent = node.parent;

  if (
    ts.isIdentifier(node) &&
    ts.isBindingElement(parent) &&
    parent.name === node &&
    parent.propertyName === void 0 &&
    ts.isObjectBindingPattern(parent.parent)
  ) {
    const owner = parent.parent.parent;
    const sourceType = ts.isVariableDeclaration(owner)
      ? owner.initializer === void 0
        ? void 0
        : checker.getTypeAtLocation(owner.initializer)
      : ts.isParameter(owner)
        ? checker.getTypeAtLocation(owner)
        : void 0;

    return sourceType === void 0
      ? checker.getSymbolAtLocation(node)
      : checker.getPropertyOfType(sourceType, node.text);
  }

  return checker.getSymbolAtLocation(node);
};

/**
 * Identifies declaration names that are not member references.
 * @param node Candidate reference node.
 * @returns True when the node is only declaring a name.
 * @example
 * ```typescript
 * const declarationOnly = isDeclarationName(propertyName);
 * ```
 */
const isDeclarationName = (node: ts.Node): boolean => {
  const parent = node.parent;

  return (
    ((ts.isPropertyDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isShorthandPropertyAssignment(parent)) &&
      parent.name === node) ||
    (ts.isVariableDeclaration(parent) && parent.name === node) ||
    ((ts.isClassDeclaration(parent) ||
      ts.isInterfaceDeclaration(parent) ||
      ts.isTypeAliasDeclaration(parent) ||
      ts.isFunctionDeclaration(parent)) &&
      parent.name === node) ||
    (ts.isParameter(parent) && parent.name === node)
  );
};

/**
 * Checks whether a member has a concrete reference in production TypeScript.
 * @param program TypeScript project program.
 * @param state Normalized public API and test patterns.
 * @param repoRoot Root directory used for glob matching.
 * @param member Member whose production usage is being checked.
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
): boolean => {
  const checker = program.getTypeChecker();
  const relatedSymbols = [
    resolveCanonicalSymbol(member.memberSymbol, checker),
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

  const normalizedRoot = path.resolve(repoRoot);

  for (const sourceFile of program.getSourceFiles()) {
    const filename = path.resolve(sourceFile.fileName);

    if (
      sourceFile.isDeclarationFile ||
      isTestFile(filename, state, normalizedRoot)
    ) {
      continue;
    }

    const findUsageSymbol = (node: ts.Node): ts.Symbol | undefined => {
      if (
        (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) &&
        !isDeclarationName(node)
      ) {
        const candidate = getUsageSymbol(node, checker);

        if (
          candidate !== void 0 &&
          relatedSymbols.some((symbol) => isSameSymbol(symbol, candidate))
        ) {
          return candidate;
        }

        if (isStructuralPropertyRead(node, checker, member)) {
          return member.memberSymbol;
        }
      }

      return isComputedMemberRead(node, checker, member, relatedSymbols) ||
        isCallArgumentMember(node, checker, member) ||
        isObjectContractHandoff(node, checker, member)
        ? member.memberSymbol
        : ts.forEachChild(node, findUsageSymbol);
    };

    if (findUsageSymbol(sourceFile) !== void 0) {
      return true;
    }
  }

  return false;
};

export { hasProductionUsage };
