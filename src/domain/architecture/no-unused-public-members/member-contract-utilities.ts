import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";
import type { MemberAnalysisScope } from "./member-scope-utilities";

import {
  isSameSymbol,
  resolveCanonicalSymbol,
} from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { isSupportedMember } from "./member-host-utilities";

type HeritageDeclaration =
  ts.ClassDeclaration | ts.ClassExpression | ts.InterfaceDeclaration;

interface HeritageMemberDeclarations {
  declaration: HeritageDeclaration;
  members: ts.Node[];
}

const heritageDeclarationsByMember = new WeakMap<
  MemberAnalysisScope,
  Map<string, HeritageMemberDeclarations[]>
>();

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
 * Gets declarations that directly define a member with the requested name.
 * @param scope Eligible production files in the host's analysis folder.
 * @param memberName Static name of the member being resolved.
 * @returns Matching declarations and their member nodes.
 * @example
 * ```typescript
 * const declarations = getHeritageMemberDeclarations(scope, "run");
 * ```
 */
const getHeritageMemberDeclarations = (
  scope: MemberAnalysisScope,
  memberName: string,
): HeritageMemberDeclarations[] => {
  let declarationsByMember = heritageDeclarationsByMember.get(scope);

  if (declarationsByMember === void 0) {
    const index = new Map<string, HeritageMemberDeclarations[]>();
    const visit = (node: ts.Node): void => {
      if (
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isClassExpression(node)
      ) {
        const membersByName = new Map<string, ts.Node[]>();

        for (const member of node.members) {
          const name = getDeclaredMemberName(member);

          if (name === void 0) {
            continue;
          }

          const members = membersByName.get(name) ?? [];
          members.push(member);
          membersByName.set(name, members);
        }

        for (const [name, members] of membersByName) {
          const declarations = index.get(name) ?? [];
          declarations.push({ declaration: node, members });
          index.set(name, declarations);
        }
      }

      ts.forEachChild(node, visit);
    };

    for (const sourceFile of scope.sourceFiles) {
      visit(sourceFile);
    }

    declarationsByMember = index;
    heritageDeclarationsByMember.set(scope, index);
  }

  return declarationsByMember.get(memberName) ?? [];
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

const heritageSymbolsByMemberDeclaration = new WeakMap<
  MemberAnalysisScope,
  WeakMap<ts.Node, ts.Symbol[]>
>();

/**
 * Collects member symbols linked by implemented or inherited types.
 * @param scope Eligible production files in the host's analysis folder.
 * @param checker TypeScript type checker.
 * @param targetMember Member whose related contracts are being found.
 * @returns Related member symbols from contract declarations.
 * @example
 * ```typescript
 * const symbols = collectHeritageMemberSymbols(scope, checker, member);
 * ```
 */
const collectHeritageMemberSymbols = (
  scope: MemberAnalysisScope,
  checker: ts.TypeChecker,
  targetMember: PublicMember,
): ts.Symbol[] => {
  let cache = heritageSymbolsByMemberDeclaration.get(scope);
  if (cache === void 0) {
    cache = new WeakMap();
    heritageSymbolsByMemberDeclaration.set(scope, cache);
  }
  const cached = cache.get(targetMember.declaration);
  if (cached !== void 0) {
    return cached;
  }

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

  for (const {
    declaration: node,
    members: ownMembers,
  } of getHeritageMemberDeclarations(scope, targetMember.memberName)) {
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

  cache.set(targetMember.declaration, relatedSymbols);
  return relatedSymbols;
};

export { collectHeritageMemberSymbols };
