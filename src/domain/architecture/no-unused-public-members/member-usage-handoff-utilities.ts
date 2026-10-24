import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";

import {
  getCallArgumentType,
  getContextualPropertyType,
  isDeclarationOnlyMethod,
  isMemberHandoff,
} from "./member-usage-type-utilities";
import { expressionCarriesMemberValue } from "./member-usage-value-utilities";

/**
 * Checks whether a contextual property comes from an external declaration.
 * @param objectType Contextual type of the containing object literal.
 * @param propertyName Property name in the object literal.
 * @param checker TypeScript type checker.
 * @returns True when the contract is declared outside the project source.
 * @example
 * ```typescript
 * const external = isExternalPropertyContract(objectType, "docs", checker);
 * ```
 */
const isExternalPropertyContract = (
  objectType: ts.Type | undefined,
  propertyName: string,
  checker: ts.TypeChecker,
): boolean => {
  const property =
    objectType === void 0
      ? void 0
      : checker.getPropertyOfType(objectType, propertyName);

  return (
    property?.declarations?.some(
      (declaration) => declaration.getSourceFile().isDeclarationFile,
    ) ?? false
  );
};

/**
 * Checks whether a call resolves to a declaration with a local implementation.
 * @param call Call expression to inspect.
 * @param checker TypeScript type checker.
 * @returns True when the resolved declaration has a body.
 * @example
 * ```typescript
 * const implemented = hasCallImplementation(call, checker);
 * ```
 */
const hasCallImplementation = (
  call: ts.CallExpression,
  checker: ts.TypeChecker,
): boolean => {
  const declaration = checker.getResolvedSignature(call)?.getDeclaration();

  return (
    declaration !== void 0 &&
    "body" in declaration &&
    declaration.body !== void 0
  );
};

/**
 * Checks whether an opaque value property is passed to a method contract.
 * @param objectLiteral Object literal passed to the method.
 * @param propertyName Property carrying the value.
 * @param valueExpression Value assigned to the property.
 * @param objectType Contextual type of the object literal.
 * @param checker TypeScript type checker.
 * @param member Member whose value is being handed off.
 * @returns True when a declaration-only method receives the member as opaque data.
 * @example
 * ```typescript
 * const handedOff = isOpaqueMethodContractHandoff(
 *   objectLiteral,
 *   "payload",
 *   value,
 *   type,
 *   checker,
 *   member,
 * );
 * ```
 */
const isOpaqueMethodContractHandoff = (
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
  valueExpression: ts.Expression,
  objectType: ts.Type | undefined,
  checker: ts.TypeChecker,
  member: PublicMember,
): boolean => {
  const call = objectLiteral.parent;
  const declaration = ts.isCallExpression(call)
    ? checker.getResolvedSignature(call)?.getDeclaration()
    : void 0;

  if (
    !ts.isCallExpression(call) ||
    !call.arguments.includes(objectLiteral) ||
    declaration === void 0 ||
    !isDeclarationOnlyMethod(declaration)
  ) {
    return false;
  }

  const targetType = getContextualPropertyType(
    objectType,
    propertyName,
    objectLiteral,
    checker,
  );
  const isHttpRequestBody =
    propertyName === "body" &&
    ts.isPropertyAccessExpression(call.expression) &&
    call.expression.name.text === "request";

  return (
    targetType !== void 0 &&
    ((targetType.flags & ts.TypeFlags.Unknown) !== 0 ||
      (isHttpRequestBody && (targetType.flags & ts.TypeFlags.Any) !== 0)) &&
    expressionCarriesMemberValue(valueExpression, checker, member)
  );
};

/**
 * Checks whether a value is supplied to a typed external call boundary.
 * @param node Candidate call expression.
 * @param checker TypeScript type checker.
 * @param member Member whose usage is being checked.
 * @returns True when an external call contract accepts the member shape.
 * @example
 * ```typescript
 * const used = isCallArgumentMember(node, checker, member);
 * ```
 */
const isCallArgumentMember = (
  node: ts.Node,
  checker: ts.TypeChecker,
  member: PublicMember,
): boolean => {
  if (!ts.isCallExpression(node) || hasCallImplementation(node, checker)) {
    return false;
  }

  const declaration = checker.getResolvedSignature(node)?.getDeclaration();

  return (
    declaration !== void 0 &&
    node.arguments.some((argument) => {
      const argumentType = getCallArgumentType(node, argument, checker);
      const isOpaqueJsonBody =
        isDeclarationOnlyMethod(declaration) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "json" &&
        node.arguments[0] === argument &&
        argumentType !== void 0 &&
        (argumentType.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0;

      return (
        (isOpaqueJsonBody &&
          expressionCarriesMemberValue(argument, checker, member)) ||
        isMemberHandoff(argument, argumentType, member, checker)
      );
    })
  );
};

/**
 * Checks whether a property value is forwarded into an external object contract.
 * @param node Candidate outer object property.
 * @param checker TypeScript type checker.
 * @param member Member whose host value is being forwarded.
 * @returns True when the receiving property accepts the host shape.
 * @example
 * ```typescript
 * const used = isObjectContractHandoff(node, checker, member);
 * ```
 */
const isObjectContractHandoff = (
  node: ts.Node,
  checker: ts.TypeChecker,
  member: PublicMember,
): boolean => {
  if (
    ts.isPropertyAssignment(node) &&
    ts.isObjectLiteralExpression(node.parent)
  ) {
    const name = node.name;

    if (!ts.isIdentifier(name) && !ts.isStringLiteralLike(name)) {
      return false;
    }

    const objectType = checker.getContextualType(node.parent);

    if (
      isOpaqueMethodContractHandoff(
        node.parent,
        name.text,
        node.initializer,
        objectType,
        checker,
        member,
      )
    ) {
      return true;
    }

    if (!isExternalPropertyContract(objectType, name.text, checker)) {
      return false;
    }

    const targetType = getContextualPropertyType(
      objectType,
      name.text,
      node,
      checker,
    );

    return isMemberHandoff(node.initializer, targetType, member, checker);
  }

  if (
    ts.isShorthandPropertyAssignment(node) &&
    ts.isObjectLiteralExpression(node.parent)
  ) {
    const objectType = checker.getContextualType(node.parent);

    if (
      isOpaqueMethodContractHandoff(
        node.parent,
        node.name.text,
        node.name,
        objectType,
        checker,
        member,
      )
    ) {
      return true;
    }

    if (!isExternalPropertyContract(objectType, node.name.text, checker)) {
      return false;
    }

    const targetType = getContextualPropertyType(
      objectType,
      node.name.text,
      node,
      checker,
    );

    return isMemberHandoff(node.name, targetType, member, checker);
  }

  return false;
};

export { isCallArgumentMember, isObjectContractHandoff };
