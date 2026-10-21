import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";

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
    checker.isTypeAssignableTo(observedType, hostType) &&
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
 * Checks whether a typed handoff carries a member into a compatible contract.
 * @param sourceType Type of the value being forwarded.
 * @param targetType Type expected at the receiving boundary.
 * @param member Member whose usage is being checked.
 * @param checker TypeScript type checker.
 * @returns True when the receiving contract accepts the corresponding member.
 * @example
 * ```typescript
 * const used = isMemberHandoff(sourceType, targetType, member, checker);
 * ```
 */
const isMemberHandoff = (
  sourceType: ts.Type | undefined,
  targetType: ts.Type | undefined,
  member: PublicMember,
  checker: ts.TypeChecker,
): boolean => {
  if (sourceType === void 0 || targetType === void 0) {
    return false;
  }

  const hostType = checker.getNonNullableType(
    getMemberHostType(member, checker),
  );
  const forwardedType = checker.getNonNullableType(sourceType);
  const receivingType = checker.getNonNullableType(targetType);
  const hostProperty = checker.getPropertyOfType(hostType, member.memberName);
  const forwardedProperty = checker.getPropertyOfType(
    forwardedType,
    member.memberName,
  );
  const receivingProperty = checker.getPropertyOfType(
    receivingType,
    member.memberName,
  );

  if (
    hostProperty === void 0 ||
    forwardedProperty === void 0 ||
    receivingProperty === void 0 ||
    !(
      checker.isTypeAssignableTo(forwardedType, hostType) ||
      checker.isTypeAssignableTo(hostType, forwardedType)
    ) ||
    !checker.isTypeAssignableTo(hostType, receivingType)
  ) {
    return false;
  }

  const hostPropertyType = checker.getTypeOfSymbolAtLocation(
    hostProperty,
    member.declaration,
  );
  const receivingPropertyType = checker.getTypeOfSymbolAtLocation(
    receivingProperty,
    member.declaration,
  );

  return (
    checker.isTypeAssignableTo(hostPropertyType, receivingPropertyType) ||
    checker.isTypeAssignableTo(receivingPropertyType, hostPropertyType)
  );
};

export { getContextualPropertyType, hasCompatibleMemberShape, isMemberHandoff };
