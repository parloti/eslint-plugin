import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";
import type { MemberAnalysisScope } from "./member-scope-utilities";

import { isSameSymbol } from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { carriesMember } from "./member-factory-utilities";
import {
  getUsageProperties,
  getUsageType,
} from "./member-operation-type-utilities";

/**
 * Checks serialized property types without following method signatures.
 * @param type Type whose enumerable data may be serialized.
 * @param checker TypeScript type checker.
 * @param member Member whose declaration must be reachable.
 * @param visitedTypes Types already searched.
 * @param depth Remaining nested data depth.
 * @returns Whether the serialized data contains the member declaration.
 * @example
 * ```typescript
 * const used = containsSerializedMember(type, checker, member, new Set(), 5);
 * ```
 */
const containsSerializedMember = (
  type: ts.Type,
  checker: ts.TypeChecker,
  member: PublicMember,
  visitedTypes: Set<ts.Type>,
  depth: number,
): boolean => {
  if (depth < 0 || visitedTypes.has(type)) {
    return false;
  }
  visitedTypes.add(type);

  if (type.isUnionOrIntersection()) {
    return type.types.some((part) =>
      containsSerializedMember(part, checker, member, visitedTypes, depth),
    );
  }

  if ((type.flags & ts.TypeFlags.Object) === 0) {
    return false;
  }

  const property = checker.getPropertyOfType(type, member.memberName);
  if (property !== void 0 && isSameSymbol(property, member.memberSymbol)) {
    return true;
  }

  const elementType = checker.getIndexTypeOfType(type, ts.IndexKind.Number);
  return elementType === void 0
    ? getUsageProperties(type, checker).some(
        (nestedProperty) =>
          (nestedProperty.flags & ts.SymbolFlags.Method) === 0 &&
          containsSerializedMember(
            checker.getTypeOfSymbolAtLocation(
              nestedProperty,
              member.declaration,
            ),
            checker,
            member,
            visitedTypes,
            depth - 1,
          ),
      )
    : containsSerializedMember(
        elementType,
        checker,
        member,
        visitedTypes,
        depth - 1,
      );
};

/**
 * Checks whether an expression contains a value carrying the member.
 * @param expression Value expression to inspect.
 * @param checker TypeScript type checker.
 * @param member Member whose value is being searched for.
 * @param scope Eligible local implementations.
 * @returns True when the expression contains the member or its host value.
 * @example
 * ```typescript
 * const carries = expressionCarriesMemberValue(value, checker, member, scope);
 * ```
 */
const expressionCarriesMemberValue = (
  expression: ts.Expression,
  checker: ts.TypeChecker,
  member: PublicMember,
  scope: MemberAnalysisScope,
): boolean => {
  if (
    carriesMember(expression, checker, member, scope) ||
    containsSerializedMember(
      getUsageType(expression, checker),
      checker,
      member,
      new Set(),
      5,
    )
  ) {
    return true;
  }

  if (ts.isObjectLiteralExpression(expression)) {
    return expression.properties.some((property) => {
      return ts.isSpreadAssignment(property)
        ? expressionCarriesMemberValue(
            property.expression,
            checker,
            member,
            scope,
          )
        : (ts.isPropertyAssignment(property) &&
            expressionCarriesMemberValue(
              property.initializer,
              checker,
              member,
              scope,
            )) ||
            (ts.isShorthandPropertyAssignment(property) &&
              expressionCarriesMemberValue(
                property.name,
                checker,
                member,
                scope,
              ));
    });
  }

  return (
    ts.isArrayLiteralExpression(expression) &&
    expression.elements.some((element) =>
      expressionCarriesMemberValue(element, checker, member, scope),
    )
  );
};

export { containsSerializedMember, expressionCarriesMemberValue };
