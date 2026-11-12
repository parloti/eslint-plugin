import * as ts from "typescript";

import type { MemberAnalysisScope } from "./member-scope-utilities";

import { getUsageContextualType } from "./member-operation-type-utilities";
import { getResolvedCallDeclaration } from "./member-usage-call-utilities";
import { expressionReferencesSymbol } from "./member-usage-expression-reference-utilities";
import { isDeclarationOnlyMethod } from "./member-usage-type-utilities";

/**
 * Checks whether a declared request method receives the traced value as body.
 * @param call Candidate HTTP request.
 * @param parameterSymbol Traced parameter.
 * @param checker Active semantic checker.
 * @param scope Eligible expression sources.
 * @returns Whether an opaque request body carries the parameter.
 * @example
 * ```typescript
 * const used = isOpaqueRequestBodyHandoff(call, parameter, checker, scope);
 * ```
 */
const isOpaqueRequestBodyHandoff = (
  call: ts.CallExpression,
  parameterSymbol: ts.Symbol,
  checker: ts.TypeChecker,
  scope: MemberAnalysisScope,
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
    const optionsType = getUsageContextualType(argument, checker);
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
    return (
      (bodyType.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0 &&
      argument.properties.some((property) =>
        ts.isPropertyAssignment(property) &&
        ts.isIdentifier(property.name) &&
        property.name.text === "body"
          ? expressionReferencesSymbol(
              property.initializer,
              parameterSymbol,
              checker,
              new Set(),
              scope,
            )
          : ts.isShorthandPropertyAssignment(property) &&
            property.name.text === "body" &&
            expressionReferencesSymbol(
              property.name,
              parameterSymbol,
              checker,
              new Set(),
              scope,
            ),
      )
    );
  });
};

export { isOpaqueRequestBodyHandoff };
