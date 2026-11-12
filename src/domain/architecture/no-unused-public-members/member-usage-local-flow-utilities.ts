import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";
import type { MemberAnalysisScope } from "./member-scope-utilities";

import { hasFunctionBody } from "./member-function-utilities";
import {
  getCallParameterSymbol,
  isParameterTransmitted,
} from "./member-parameter-flow-utilities";
import { getResolvedCallDeclaration } from "./member-usage-call-utilities";
import { expressionCarriesMemberValue } from "./member-usage-value-utilities";

/**
 * Checks whether a local call forwards a member-bearing value to an HTTP body.
 * @param node Candidate local call expression.
 * @param checker TypeScript type checker.
 * @param member Member whose value is being transmitted.
 * @param scope Eligible local implementation files.
 * @returns True when the argument reaches an opaque request body contract.
 * @example
 * ```typescript
 * const transmitted = isLocalCallArgumentTransmitted(call, checker, member, scope);
 * ```
 */
const isLocalCallArgumentTransmitted = (
  node: ts.Node,
  checker: ts.TypeChecker,
  member: PublicMember,
  scope: MemberAnalysisScope,
): boolean => {
  if (!ts.isCallExpression(node)) {
    return false;
  }
  const declaration = getResolvedCallDeclaration(node, checker);
  if (
    !hasFunctionBody(declaration) ||
    !scope.sourceFiles.has(declaration.getSourceFile())
  ) {
    return false;
  }
  return node.arguments.some((argument, index) => {
    const parameter = getCallParameterSymbol(declaration, index, checker);
    return (
      parameter !== void 0 &&
      expressionCarriesMemberValue(argument, checker, member, scope) &&
      isParameterTransmitted(declaration, parameter, checker, scope)
    );
  });
};

export { isLocalCallArgumentTransmitted };
