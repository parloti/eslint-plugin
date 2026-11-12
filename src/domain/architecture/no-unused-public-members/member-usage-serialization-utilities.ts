import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";
import type { MemberAnalysisScope } from "./member-scope-utilities";

import { hasFunctionBody } from "./member-function-utilities";
import {
  getCallParameterSymbol,
  isParameterSerialized,
} from "./member-parameter-flow-utilities";
import { getResolvedCallDeclaration } from "./member-usage-call-utilities";
import { expressionCarriesMemberValue } from "./member-usage-value-utilities";

/**
 * Checks whether a local call serializes the value supplied to a parameter.
 * @param node Candidate local call expression.
 * @param checker TypeScript type checker.
 * @param member Member whose value is being consumed.
 * @param program TypeScript project program.
 * @param scope Eligible production files in the host's API folder.
 * @returns True when the argument is traced into standard JSON serialization.
 * @example
 * ```typescript
 * const used = isLocalCallArgumentSerialized(node, checker, member, program, scope);
 * ```
 */
const isLocalCallArgumentSerialized = (
  node: ts.Node,
  checker: ts.TypeChecker,
  member: PublicMember,
  program: ts.Program,
  scope: MemberAnalysisScope,
): boolean => {
  if (!ts.isCallExpression(node)) {
    return false;
  }
  const declaration = getResolvedCallDeclaration(node, checker);
  if (
    !hasFunctionBody(declaration) ||
    !ts.isBlock(declaration.body) ||
    !scope.sourceFiles.has(declaration.getSourceFile())
  ) {
    return false;
  }
  return node.arguments.some((argument, index) => {
    const parameter = getCallParameterSymbol(declaration, index, checker);
    return (
      parameter !== void 0 &&
      expressionCarriesMemberValue(argument, checker, member, scope) &&
      isParameterSerialized(declaration, parameter, checker, program, scope)
    );
  });
};

export { isLocalCallArgumentSerialized };
