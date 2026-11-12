import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";
import type { MemberAnalysisScope } from "./member-scope-utilities";

import { carriesMember } from "./member-factory-utilities";
import { getUsageType } from "./member-operation-type-utilities";
import { getResolvedCallDeclaration } from "./member-usage-call-utilities";
import { containsSerializedMember } from "./member-usage-value-utilities";

/**
 * Checks whether a call resolves to standard-library JSON.stringify.
 * @param node Candidate call expression.
 * @param checker TypeScript type checker.
 * @param program TypeScript project used to identify standard declarations.
 * @returns True when the call is the standard JSON serializer.
 * @example
 * ```typescript
 * const isJson = isStandardJsonStringifyCall(node, checker, program);
 * ```
 */
const isStandardJsonStringifyCall = (
  node: ts.Node,
  checker: ts.TypeChecker,
  program: ts.Program,
): boolean => {
  if (!ts.isCallExpression(node)) {
    return false;
  }

  const declaration = getResolvedCallDeclaration(node, checker);

  return (
    declaration !== void 0 &&
    ts.isMethodSignature(declaration) &&
    ts.isIdentifier(declaration.name) &&
    declaration.name.text === "stringify" &&
    ts.isInterfaceDeclaration(declaration.parent) &&
    declaration.parent.name.text === "JSON" &&
    program.isSourceFileDefaultLibrary(declaration.getSourceFile())
  );
};

/**
 * Checks whether an operation copies or serializes a member-bearing value.
 * @param node Candidate spread or call expression.
 * @param checker TypeScript type checker.
 * @param member Member whose value is being consumed.
 * @param program TypeScript program used to identify standard library declarations.
 * @param scope Eligible local implementations.
 * @returns True when the operation consumes the object's own properties.
 * @example
 * ```typescript
 * const used = isWholeObjectRead(node, checker, member, program, scope);
 * ```
 */
const isWholeObjectRead = (
  node: ts.Node,
  checker: ts.TypeChecker,
  member: PublicMember,
  program: ts.Program,
  scope: MemberAnalysisScope,
): boolean => {
  if (
    ts.isClassDeclaration(member.hostDeclaration) &&
    !ts.isPropertyDeclaration(member.declaration)
  ) {
    return false;
  }

  if (ts.isSpreadAssignment(node)) {
    return carriesMember(node.expression, checker, member, scope);
  }

  if (!ts.isCallExpression(node) || node.arguments.length !== 1) {
    return false;
  }

  const argument = node.arguments[0];

  return (
    isStandardJsonStringifyCall(node, checker, program) &&
    argument !== void 0 &&
    (carriesMember(argument, checker, member, scope) ||
      containsSerializedMember(
        getUsageType(argument, checker),
        checker,
        member,
        new Set(),
        5,
      ))
  );
};

export { isStandardJsonStringifyCall, isWholeObjectRead };
