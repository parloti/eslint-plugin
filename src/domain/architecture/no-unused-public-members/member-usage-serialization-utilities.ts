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
    !hasBlockBody(declaration) ||
    declaration.parameters.length === 0
  ) {
    return false;
  }

  return node.arguments.some((argument, argumentIndex) => {
    const parameter =
      declaration.parameters[
        Math.min(argumentIndex, declaration.parameters.length - 1)
      ];
    const parameterSymbol =
      parameter === void 0 || !ts.isIdentifier(parameter.name)
        ? void 0
        : checker.getSymbolAtLocation(parameter.name);

    return (
      parameterSymbol !== void 0 &&
      expressionCarriesMemberValue(argument, checker, member) &&
      localParameterReachesJsonStringify(
        declaration,
        parameterSymbol,
        checker,
        program,
        new Map(),
      )
    );
  });
};

/**
 * Traces a local parameter through calls until standard JSON serialization.
 * @param declaration Function containing the parameter.
 * @param parameterSymbol Parameter currently being traced.
 * @param checker TypeScript type checker.
 * @param program TypeScript project used to identify standard declarations.
 * @param visitedParameters Parameter references already inspected.
 * @returns True when the parameter reaches standard JSON serialization.
 * @example
 * ```typescript
 * const serialized = localParameterReachesJsonStringify(
 *   declaration,
 *   parameterSymbol,
 *   checker,
 *   program,
 *   new Map(),
 * );
 * ```
 */
const localParameterReachesJsonStringify = (
  declaration: ts.SignatureDeclaration,
  parameterSymbol: ts.Symbol,
  checker: ts.TypeChecker,
  program: ts.Program,
  visitedParameters: Map<ts.SignatureDeclaration, Set<ts.Symbol>>,
): boolean => {
  if (!hasBlockBody(declaration)) {
    return false;
  }

  const visited = visitedParameters.get(declaration) ?? new Set<ts.Symbol>();
  if (visited.has(parameterSymbol)) {
    return false;
  }
  visited.add(parameterSymbol);
  visitedParameters.set(declaration, visited);

  const inspect = (node: ts.Node): true | undefined => {
    if (node !== declaration && ts.isFunctionLike(node)) {
      return void 0;
    }

    if (ts.isCallExpression(node)) {
      if (
        isStandardJsonStringifyCall(node, checker, program) &&
        node.arguments.length === 1 &&
        node.arguments[0] !== void 0 &&
        expressionReferencesSymbol(node.arguments[0], parameterSymbol, checker)
      ) {
        return true;
      }

      const nestedDeclaration = checker
        .getResolvedSignature(node)
        ?.getDeclaration();
      if (nestedDeclaration !== void 0 && hasBlockBody(nestedDeclaration)) {
        for (const [argumentIndex, argument] of node.arguments.entries()) {
          if (!expressionReferencesSymbol(argument, parameterSymbol, checker)) {
            continue;
          }

          const nestedParameter =
            nestedDeclaration.parameters[
              Math.min(argumentIndex, nestedDeclaration.parameters.length - 1)
            ];
          const nestedParameterSymbol =
            nestedParameter === void 0 || !ts.isIdentifier(nestedParameter.name)
              ? void 0
              : checker.getSymbolAtLocation(nestedParameter.name);
          if (
            nestedParameterSymbol !== void 0 &&
            localParameterReachesJsonStringify(
              nestedDeclaration,
              nestedParameterSymbol,
              checker,
              program,
              visitedParameters,
            )
          ) {
            return true;
          }
        }
      }
    }

    return ts.forEachChild(node, inspect);
  };

  return inspect(declaration.body) === true;
};

/**
 * Narrows a signature to a function body represented by a block.
 * @param declaration Candidate function declaration.
 * @returns Whether the declaration has a block body.
 * @example
 * ```typescript
 * if (hasBlockBody(declaration)) inspect(declaration.body);
 * ```
 */
const hasBlockBody = (
  declaration: ts.SignatureDeclaration,
): declaration is ts.SignatureDeclaration & { body: ts.Block } =>
  "body" in declaration &&
  declaration.body !== void 0 &&
  ts.isBlock(declaration.body);

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
