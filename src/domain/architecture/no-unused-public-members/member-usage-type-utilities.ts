import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";

import { carriesMember } from "./member-usage-value-utilities";

/**
 * Gets the declared type of the host that owns a public member.
 * @param member Member whose host type is needed.
 * @param checker TypeScript type checker.
 * @returns Host type used for structural usage checks.
 * @example
 * ```typescript
 * const hostType = getMemberHostType(member, checker);
 * ```
 */
const getMemberHostType = (
  member: PublicMember,
  checker: ts.TypeChecker,
): ts.Type => {
  const declaration = member.hostDeclaration;
  const location = ts.isVariableDeclaration(declaration)
    ? declaration.name
    : declaration;

  return checker.getTypeAtLocation(location);
};

/**
 * Checks whether a value type carries a structurally corresponding member.
 * @param valueType Type of the value being inspected.
 * @param member Member whose host shape is required.
 * @param checker TypeScript type checker.
 * @returns True when TypeScript relates the value and host shapes.
 * @example
 * ```typescript
 * const matches = hasCompatibleMemberShape(valueType, member, checker);
 * ```
 */
const hasCompatibleMemberShape = (
  valueType: ts.Type,
  member: PublicMember,
  checker: ts.TypeChecker,
): boolean => {
  const hostType = checker.getNonNullableType(
    getMemberHostType(member, checker),
  );
  const observedType = checker.getNonNullableType(valueType);
  const hostProperty = checker.getPropertyOfType(hostType, member.memberName);
  const observedProperty = checker.getPropertyOfType(
    observedType,
    member.memberName,
  );

  return (
    hostProperty !== void 0 &&
    observedProperty !== void 0 &&
    checker.isTypeAssignableTo(hostType, observedType)
  );
};

/**
 * Gets the property type supplied by an object's contextual contract.
 * @param objectType Expected shape for the object literal.
 * @param propertyName Property name in the object literal.
 * @param location Node used to resolve the property type.
 * @param checker TypeScript type checker.
 * @returns Contextual property type when one is declared.
 * @example
 * ```typescript
 * const type = getContextualPropertyType(objectType, "docs", node, checker);
 * ```
 */
const getContextualPropertyType = (
  objectType: ts.Type | undefined,
  propertyName: string,
  location: ts.Node,
  checker: ts.TypeChecker,
): ts.Type | undefined => {
  const property =
    objectType === void 0
      ? void 0
      : checker.getPropertyOfType(objectType, propertyName);

  return property === void 0
    ? void 0
    : checker.getTypeOfSymbolAtLocation(property, location);
};

/**
 * Gets the resolved parameter type for a call argument.
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
 * Checks whether a method declaration contains only a contract.
 * @param declaration Candidate method declaration.
 * @returns True when the declaration has no implementation body.
 * @example
 * ```typescript
 * const declarationOnly = isDeclarationOnlyMethod(declaration);
 * ```
 */
const isDeclarationOnlyMethod = (declaration: ts.Node): boolean =>
  ts.isCallSignatureDeclaration(declaration) ||
  ts.isFunctionTypeNode(declaration) ||
  ts.isMethodSignature(declaration) ||
  (ts.isMethodDeclaration(declaration) && declaration.body === void 0);

/**
 * Resolves a named property or the string-index contract accepting it.
 * @param type Object type whose member is being forwarded.
 * @param member Member supplying the property name and type location.
 * @param checker TypeScript type checker.
 * @returns Explicit property type or string-index value type.
 * @example
 * ```typescript
 * const valueType = getPropertyOrIndexType(type, member, checker);
 * ```
 */
const getPropertyOrIndexType = (
  type: ts.Type,
  member: PublicMember,
  checker: ts.TypeChecker,
): ts.Type | undefined => {
  const property = checker.getPropertyOfType(type, member.memberName);

  return property === void 0
    ? checker.getIndexTypeOfType(type, ts.IndexKind.String)
    : checker.getTypeOfSymbolAtLocation(property, member.declaration);
};

/**
 * Checks whether a typed handoff carries a member into a compatible contract.
 * @param sourceExpression Value being forwarded.
 * @param targetType Type expected at the receiving boundary.
 * @param member Member whose usage is being checked.
 * @param checker TypeScript type checker.
 * @returns True when the receiving contract accepts the corresponding member.
 * @example
 * ```typescript
 * const used = isMemberHandoff(expression, targetType, member, checker);
 * ```
 */
const isMemberHandoff = (
  sourceExpression: ts.Expression,
  targetType: ts.Type | undefined,
  member: PublicMember,
  checker: ts.TypeChecker,
): boolean => {
  if (targetType === void 0) {
    return false;
  }

  const hostType = checker.getNonNullableType(
    getMemberHostType(member, checker),
  );
  const forwardedType = checker.getNonNullableType(
    checker.getTypeAtLocation(sourceExpression),
  );
  const receivingType = checker.getNonNullableType(targetType);

  if (receivingType.isUnion()) {
    return receivingType.types.some((part) =>
      isMemberHandoff(sourceExpression, part, member, checker),
    );
  }

  if (
    checker.getPropertyOfType(receivingType, member.memberName) === void 0 &&
    !carriesMember(sourceExpression, checker, member)
  ) {
    return false;
  }

  const hostPropertyType = getPropertyOrIndexType(hostType, member, checker);
  const forwardedPropertyType = getPropertyOrIndexType(
    forwardedType,
    member,
    checker,
  );
  const receivingPropertyType = getPropertyOrIndexType(
    receivingType,
    member,
    checker,
  );

  return (
    hostPropertyType !== void 0 &&
    forwardedPropertyType !== void 0 &&
    receivingPropertyType !== void 0 &&
    (checker.isTypeAssignableTo(forwardedType, hostType) ||
      checker.isTypeAssignableTo(hostType, forwardedType)) &&
    checker.isTypeAssignableTo(hostType, receivingType) &&
    (checker.isTypeAssignableTo(hostPropertyType, receivingPropertyType) ||
      checker.isTypeAssignableTo(receivingPropertyType, hostPropertyType))
  );
};

export {
  getCallArgumentType,
  getContextualPropertyType,
  hasCompatibleMemberShape,
  isDeclarationOnlyMethod,
  isMemberHandoff,
};
