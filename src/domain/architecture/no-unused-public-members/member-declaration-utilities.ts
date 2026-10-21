import { ESLintUtils } from "@typescript-eslint/utils";
import * as ts from "typescript";

import { isSameSymbol } from "../no-unused-exports/no-unused-exports-symbol-utilities";
import {
  collectMemberHosts,
  getMemberSymbol,
  getStaticMemberName,
  isPublicClassMember,
  isSupportedMember,
} from "./member-host-utilities";

/** One public member and its owning declaration. */
export interface PublicMember {
  /** Member declaration in the TypeScript source tree. */
  declaration: ts.Node;

  /** Host declaration used to resolve declared member types. */
  hostDeclaration: ts.Node;

  /** Display name of the host. */
  hostName: string;

  /** Symbol of the host declaration, when available. */
  hostSymbol: ts.Symbol | undefined;

  /** Name used for contract matching and diagnostics. */
  memberName: string;

  /** TypeScript symbol for the member declaration. */
  memberSymbol: ts.Symbol;

  /** ESTree node used for the diagnostic location. */
  reportNode: ReturnType<ParserServices["tsNodeToESTreeNodeMap"]["get"]>;
}

type ParserServices = ReturnType<typeof ESLintUtils.getParserServices>;

/**
 * Collects direct public members from one source file.
 * @param sourceFile Source file being analyzed.
 * @param checker TypeScript type checker.
 * @param parserServices TypeScript and ESTree node maps.
 * @returns Public member declarations with resolved symbols.
 * @example
 * ```typescript
 * const members = collectPublicMembers(sourceFile, checker, parserServices);
 * ```
 */
const collectPublicMembers = (
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  parserServices: ParserServices,
): PublicMember[] => {
  const members: PublicMember[] = [];

  for (const host of collectMemberHosts(sourceFile, checker)) {
    const hostType = checker.getTypeAtLocation(host.node);
    const isClassHost = ts.isClassDeclaration(host.node);

    for (const declaration of host.members) {
      if (
        !isSupportedMember(declaration) ||
        (isClassHost && !isPublicClassMember(declaration))
      ) {
        continue;
      }

      const nameNode = (declaration as ts.NamedDeclaration).name;
      const memberName = getStaticMemberName(nameNode);

      if (
        memberName === "constructor" ||
        nameNode === void 0 ||
        memberName === void 0 ||
        !parserServices.tsNodeToESTreeNodeMap.has(nameNode)
      ) {
        continue;
      }

      const memberSymbol = getMemberSymbol(
        checker,
        declaration,
        memberName,
        hostType,
      );

      if (
        memberSymbol === void 0 ||
        members.some(
          (existing) =>
            existing.hostSymbol === host.symbol &&
            existing.hostName === host.name &&
            isSameSymbol(existing.memberSymbol, memberSymbol),
        )
      ) {
        continue;
      }

      members.push({
        declaration,
        hostDeclaration: host.node,
        hostName: host.name,
        hostSymbol: host.symbol,
        memberName,
        memberSymbol,
        reportNode: parserServices.tsNodeToESTreeNodeMap.get(nameNode),
      });
    }
  }

  return members;
};

export { collectPublicMembers };
