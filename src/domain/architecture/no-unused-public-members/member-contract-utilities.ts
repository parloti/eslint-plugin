import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";

import {
  isSameSymbol,
  resolveCanonicalSymbol,
} from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { isSupportedMember } from "./member-host-utilities";

/**
 * Extracts the static key from a supported member declaration.
 * @param declaration TypeScript member node to inspect.
 * @returns Static name when the declaration is supported.
 * @example
 * ```typescript
 * const name = getDeclaredMemberName(memberDeclaration);
 * ```
 */
const getDeclaredMemberName = (declaration: ts.Node): string | undefined => {
  if (!isSupportedMember(declaration)) {
    return void 0;
  }

  const name = (declaration as ts.NamedDeclaration).name;

  return name !== void 0 &&
    (ts.isIdentifier(name) || ts.isStringLiteralLike(name))
    ? name.text
    : void 0;
};

/**
 * Gets the symbol for one direct member declaration.
 * @param checker TypeScript type checker.
 * @param declaration TypeScript syntax node naming the member.
 * @param memberName Static member name.
 * @returns Member symbol when available.
 * @example
 * ```typescript
 * const symbol = getDeclaredMemberSymbol(checker, declaration, "run");
 * ```
 */
const getDeclaredMemberSymbol = (
  checker: ts.TypeChecker,
  declaration: ts.Node,
  memberName: string,
): ts.Symbol | undefined => {
  const name = (declaration as ts.NamedDeclaration).name;

  return name === void 0
    ? void 0
    : (checker.getSymbolAtLocation(name) ??
        checker.getPropertyOfType(
          checker.getTypeAtLocation(declaration.parent),
          memberName,
        ));
};

/**
 * Collects member symbols linked by implemented or inherited types.
 * @param program TypeScript project program.
 * @param checker TypeScript type checker.
 * @param targetMember Member whose related contracts are being found.
 * @returns Related member symbols from contract declarations.
 * @example
 * ```typescript
 * const symbols = collectHeritageMemberSymbols(program, checker, member);
 * ```
 */
const collectHeritageMemberSymbols = (
  program: ts.Program,
  checker: ts.TypeChecker,
  targetMember: PublicMember,
): ts.Symbol[] => {
  const relatedSymbols: ts.Symbol[] = [];
  const targetSymbol = resolveCanonicalSymbol(
    targetMember.memberSymbol,
    checker,
  );
  const addSymbol = (candidate: ts.Symbol | undefined): void => {
    if (
      candidate !== void 0 &&
      relatedSymbols.every((symbol) => !isSameSymbol(symbol, candidate))
    ) {
      relatedSymbols.push(candidate);
    }
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isClassExpression(node)
    ) {
      const ownMembers = node.members.filter(
        (member) => getDeclaredMemberName(member) === targetMember.memberName,
      );
      const matchingHeritageSymbols: ts.Symbol[] = [];

      const heritageClauses = node.heritageClauses ?? [];

      for (const clause of heritageClauses) {
        for (const heritageType of clause.types) {
          const inheritedMember = checker.getPropertyOfType(
            checker.getTypeAtLocation(heritageType),
            targetMember.memberName,
          );

          if (
            inheritedMember !== void 0 &&
            (isSameSymbol(
              resolveCanonicalSymbol(inheritedMember, checker),
              targetSymbol,
            ) ||
              node === targetMember.declaration.parent)
          ) {
            matchingHeritageSymbols.push(inheritedMember);
          }
        }
      }

      if (node === targetMember.declaration.parent) {
        for (const member of ownMembers) {
          addSymbol(
            getDeclaredMemberSymbol(checker, member, targetMember.memberName),
          );
        }
      }

      if (matchingHeritageSymbols.length > 0) {
        for (const member of ownMembers) {
          addSymbol(
            getDeclaredMemberSymbol(checker, member, targetMember.memberName),
          );
        }
      }

      for (const symbol of matchingHeritageSymbols) {
        addSymbol(symbol);
      }
    }

    ts.forEachChild(node, visit);
  };

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      visit(sourceFile);
    }
  }

  return relatedSymbols;
};

export { collectHeritageMemberSymbols };
