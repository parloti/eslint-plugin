import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";

import { getResolvedCallDeclaration } from "./member-usage-call-utilities";
import { expressionReferencesSymbol } from "./member-usage-expression-reference-utilities";
import { isDeclarationOnlyMethod } from "./member-usage-type-utilities";
import { expressionCarriesMemberValue } from "./member-usage-value-utilities";

const requestBodyParameters = new WeakMap<
  ts.TypeChecker,
  WeakMap<ts.SignatureDeclaration, WeakSet<ts.Symbol>>
>();

/**
 * Checks whether a local call forwards a member-bearing value to an HTTP body.
 * @param node Candidate local call expression.
 * @param checker TypeScript type checker.
 * @param member Member whose value is being transmitted.
 * @returns True when the argument reaches an opaque request body contract.
 * @example
 * ```typescript
 * const transmitted = isLocalCallArgumentTransmitted(call, checker, member);
 * ```
 */
const isLocalCallArgumentTransmitted = (
  node: ts.Node,
  checker: ts.TypeChecker,
  member: PublicMember,
): boolean => {
  if (!ts.isCallExpression(node)) {
    return false;
  }

  const declaration = getResolvedCallDeclaration(node, checker);
  if (!hasFunctionBody(declaration)) {
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
      localParameterReachesRequestBody(
        declaration,
        parameterSymbol,
        checker,
        new Map(),
      )
    );
  });
};

/**
 * Checks whether a local parameter reaches a declared HTTP request body.
 * @param declaration Local function containing the parameter.
 * @param parameterSymbol Parameter symbol whose value is traced.
 * @param checker TypeScript type checker.
 * @param visitedDeclarations Function declarations already inspected.
 * @returns True when the parameter reaches an opaque request body.
 * @example
 * ```typescript
 * const reachesBody = localParameterReachesRequestBody(
 *   declaration,
 *   parameterSymbol,
 *   checker,
 *   new Set(),
 * );
 * ```
 */
const localParameterReachesRequestBody = (
  declaration: ts.SignatureDeclaration,
  parameterSymbol: ts.Symbol,
  checker: ts.TypeChecker,
  visitedDeclarations: Map<ts.SignatureDeclaration, Set<ts.Symbol>>,
): boolean => {
  if (!hasFunctionBody(declaration)) {
    return false;
  }

  if (
    requestBodyParameters.get(checker)?.get(declaration)?.has(parameterSymbol)
  ) {
    return true;
  }

  const visitedParameters =
    visitedDeclarations.get(declaration) ?? new Set<ts.Symbol>();
  if (visitedParameters.has(parameterSymbol)) {
    return false;
  }
  visitedParameters.add(parameterSymbol);
  visitedDeclarations.set(declaration, visitedParameters);

  const inspect = (node: ts.Node): true | undefined => {
    if (ts.isCallExpression(node)) {
      const isBody = isOpaqueRequestBodyHandoff(node, parameterSymbol, checker);
      if (isBody) {
        return true;
      }

      const nestedDeclaration = getResolvedCallDeclaration(node, checker);
      if (hasFunctionBody(nestedDeclaration)) {
        for (const [argumentIndex, argument] of node.arguments.entries()) {
          const references = expressionReferencesSymbol(
            argument,
            parameterSymbol,
            checker,
          );
          if (!references) {
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
            localParameterReachesRequestBody(
              nestedDeclaration,
              nestedParameterSymbol,
              checker,
              visitedDeclarations,
            )
          ) {
            return true;
          }
        }
      }
    }

    return ts.forEachChild(node, inspect);
  };

  const reachesRequestBody = inspect(declaration.body) === true;

  if (reachesRequestBody) {
    let declarations = requestBodyParameters.get(checker);

    if (declarations === void 0) {
      declarations = new WeakMap();
      requestBodyParameters.set(checker, declarations);
    }

    let parameters = declarations.get(declaration);

    if (parameters === void 0) {
      parameters = new WeakSet();
      declarations.set(declaration, parameters);
    }

    parameters.add(parameterSymbol);
  }

  return reachesRequestBody;
};

/**
 * Checks whether a request call sends the traced parameter as opaque body data.
 * @param call Candidate call expression.
 * @param parameterSymbol Parameter symbol whose value is traced.
 * @param checker TypeScript type checker.
 * @returns True when a declaration-only request method accepts the value as body.
 * @example
 * ```typescript
 * const opaque = isOpaqueRequestBodyHandoff(call, parameterSymbol, checker);
 * ```
 */
const isOpaqueRequestBodyHandoff = (
  call: ts.CallExpression,
  parameterSymbol: ts.Symbol,
  checker: ts.TypeChecker,
): boolean => {
  const declaration = getResolvedCallDeclaration(call, checker);

  if (
    declaration === void 0 ||
    !isDeclarationOnlyMethod(declaration) ||
    !ts.isPropertyAccessExpression(call.expression) ||
    call.expression.name.text !== "request"
  ) {
    return false;
  }

  return call.arguments.some((argument) => {
    if (!ts.isObjectLiteralExpression(argument)) {
      return false;
    }

    const optionsType = checker.getContextualType(argument);
    const requestOptionsType =
      optionsType === void 0 ? void 0 : checker.getNonNullableType(optionsType);
    const bodyProperty =
      requestOptionsType === void 0
        ? void 0
        : checker.getPropertyOfType(requestOptionsType, "body");
    if (bodyProperty === void 0) {
      return false;
    }

    const bodyType = checker.getTypeOfSymbolAtLocation(bodyProperty, argument);
    if ((bodyType.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) === 0) {
      return false;
    }

    return argument.properties.some((property) => {
      return ts.isPropertyAssignment(property) &&
        ts.isIdentifier(property.name) &&
        property.name.text === "body"
        ? expressionReferencesSymbol(
            property.initializer,
            parameterSymbol,
            checker,
          )
        : ts.isShorthandPropertyAssignment(property) &&
            property.name.text === "body" &&
            expressionReferencesSymbol(property.name, parameterSymbol, checker);
    });
  });
};

/**
 * Narrows a function-like declaration to one with a body.
 * @param declaration Candidate call signature declaration.
 * @returns Whether the declaration has a function body.
 * @example
 * ```typescript
 * if (hasFunctionBody(declaration)) inspect(declaration.body);
 * ```
 */
const hasFunctionBody = (
  declaration: ts.SignatureDeclaration | undefined,
): declaration is ts.SignatureDeclaration & { body: ts.ConciseBody } =>
  declaration !== void 0 &&
  "body" in declaration &&
  declaration.body !== void 0;

export { isLocalCallArgumentTransmitted };
