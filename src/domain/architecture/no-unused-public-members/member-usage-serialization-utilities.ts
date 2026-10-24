import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";

import { expressionReferencesSymbol } from "./member-usage-expression-reference-utilities";
import {
  carriesMember,
  containsSerializedMember,
  expressionCarriesMemberValue,
} from "./member-usage-value-utilities";

/**
 * Checks whether a local call serializes the value supplied to a parameter.
 * @param node Candidate local call expression.
 * @param checker TypeScript type checker.
 * @param member Member whose value is being consumed.
 * @param program TypeScript project program.
 * @returns True when the argument is traced into standard JSON serialization.
 * @example
 * ```typescript
 * const used = isLocalCallArgumentSerialized(node, checker, member, program);
 * ```
 */
const isLocalCallArgumentSerialized = (
  node: ts.Node,
  checker: ts.TypeChecker,
  member: PublicMember,
  program: ts.Program,
): boolean => {
  if (!ts.isCallExpression(node)) {
    return false;
  }

  const declaration = checker.getResolvedSignature(node)?.getDeclaration();
  if (
    declaration === void 0 ||
    !("body" in declaration) ||
    declaration.body === void 0 ||
    !ts.isBlock(declaration.body) ||
    declaration.parameters.length === 0
  ) {
    return false;
  }
  const body = declaration.body;

  return node.arguments.some((argument, argumentIndex) => {
    const parameter =
      declaration.parameters[
        Math.min(argumentIndex, declaration.parameters.length - 1)
      ];
    const parameterSymbol =
      parameter === void 0 || !ts.isIdentifier(parameter.name)
        ? void 0
        : checker.getSymbolAtLocation(parameter.name);

    if (
      parameterSymbol === void 0 ||
      !expressionCarriesMemberValue(argument, checker, member)
    ) {
      return false;
    }

    const isSerializedParameter = (candidate: ts.Node): true | undefined => {
      if (candidate !== declaration && ts.isFunctionLike(candidate)) {
        return void 0;
      }

      return ts.isCallExpression(candidate) &&
        isStandardJsonStringifyCall(candidate, checker, program) &&
        candidate.arguments.length === 1 &&
        candidate.arguments[0] !== void 0 &&
        expressionReferencesSymbol(
          candidate.arguments[0],
          parameterSymbol,
          checker,
        )
        ? true
        : ts.forEachChild(candidate, isSerializedParameter);
    };

    return isSerializedParameter(body) === true;
  });
};

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

  const declaration = checker.getResolvedSignature(node)?.getDeclaration();

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
 * @returns True when the operation consumes the object's own properties.
 * @example
 * ```typescript
 * const used = isWholeObjectRead(node, checker, member, program);
 * ```
 */
const isWholeObjectRead = (
  node: ts.Node,
  checker: ts.TypeChecker,
  member: PublicMember,
  program: ts.Program,
): boolean => {
  if (
    ts.isClassDeclaration(member.hostDeclaration) &&
    !ts.isPropertyDeclaration(member.declaration)
  ) {
    return false;
  }

  if (ts.isSpreadAssignment(node)) {
    return carriesMember(node.expression, checker, member);
  }

  if (!ts.isCallExpression(node) || node.arguments.length !== 1) {
    return false;
  }

  const argument = node.arguments[0];

  return (
    isStandardJsonStringifyCall(node, checker, program) &&
    argument !== void 0 &&
    (carriesMember(argument, checker, member) ||
      containsSerializedMember(
        checker.getTypeAtLocation(argument),
        checker,
        member,
        new Set(),
        5,
      ))
  );
};

export { isLocalCallArgumentSerialized, isWholeObjectRead };
