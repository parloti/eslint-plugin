import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";

import {
  getContextualPropertyType,
  isMemberHandoff,
} from "./member-usage-type-utilities";

/**
 * Finds a call argument's resolved parameter type.
 * @param call Call expression containing the argument.
 * @param argument Argument expression to inspect.
 * @param checker TypeScript type checker.
 * @returns Parameter type when TypeScript resolves the call.
 * @example
 * ```typescript
 * const parameterType = getCallArgumentType(call, argument, checker);
 * ```
 */
const getCallArgumentType = (
  call: ts.CallExpression,
  argument: ts.Expression,
  checker: ts.TypeChecker,
): ts.Type | undefined => {
  const contextualType = checker.getContextualType(argument);

  if (contextualType !== void 0) {
    return contextualType;
  }

  const argumentIndex = call.arguments.indexOf(argument);
  const signature = checker.getResolvedSignature(call);
  const parameter =
    signature === void 0 ? void 0 : signature.parameters[argumentIndex];

  return parameter === void 0
    ? void 0
    : checker.getTypeOfSymbolAtLocation(parameter, call);
};

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
 * Checks whether an object property is supplied to a typed call boundary.
 * @param node Candidate property assignment.
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
  if (
    !ts.isPropertyAssignment(node) ||
    (!ts.isIdentifier(node.name) && !ts.isStringLiteralLike(node.name)) ||
    !ts.isObjectLiteralExpression(node.parent)
  ) {
    return false;
  }

  const call = node.parent.parent;

  if (
    !ts.isCallExpression(call) ||
    hasCallImplementation(call, checker) ||
    !call.arguments.some((argument) => argument === node.parent)
  ) {
    return false;
  }

  const targetType = getCallArgumentType(call, node.parent, checker);

  return (
    node.name.text === member.memberName &&
    isMemberHandoff(
      checker.getTypeAtLocation(node.parent),
      targetType,
      member,
      checker,
    )
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

    if (!isExternalPropertyContract(objectType, name.text, checker)) {
      return false;
    }

    const sourceType = checker.getTypeAtLocation(node.initializer);
    const targetType = getContextualPropertyType(
      objectType,
      name.text,
      node,
      checker,
    );

    return isMemberHandoff(sourceType, targetType, member, checker);
  }

  if (
    ts.isShorthandPropertyAssignment(node) &&
    ts.isObjectLiteralExpression(node.parent)
  ) {
    const objectType = checker.getContextualType(node.parent);

    if (!isExternalPropertyContract(objectType, node.name.text, checker)) {
      return false;
    }

    const sourceType = checker.getTypeAtLocation(node.name);
    const targetType = getContextualPropertyType(
      objectType,
      node.name.text,
      node,
      checker,
    );

    return isMemberHandoff(sourceType, targetType, member, checker);
  }

  return false;
};

export { isCallArgumentMember, isObjectContractHandoff };
