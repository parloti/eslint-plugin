import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";

import {
  isSameSymbol,
  resolveCanonicalSymbol,
} from "../no-unused-exports/no-unused-exports-symbol-utilities";

/**
 * Checks whether an expression carries the member's declaration.
 * @param expression Value being copied or serialized.
 * @param checker TypeScript type checker.
 * @param member Member whose declaration must be present.
 * @param visitedExpressions Expressions already inspected across local return paths.
 * @returns True when the expression carries this member rather than an unrelated matching shape.
 * @example
 * ```typescript
 * const matches = carriesMember(expression, checker, member);
 * ```
 */
const carriesMember = (
  expression: ts.Expression,
  checker: ts.TypeChecker,
  member: PublicMember,
  visitedExpressions: Set<ts.Expression> = new Set(),
): boolean => {
  if (visitedExpressions.has(expression)) {
    return false;
  }
  visitedExpressions.add(expression);

  const expressionSymbol = ts.isShorthandPropertyAssignment(expression.parent)
    ? checker.getShorthandAssignmentValueSymbol(expression.parent)
    : checker.getSymbolAtLocation(expression);
  if (
    ts.isVariableDeclaration(member.hostDeclaration) &&
    member.hostSymbol !== void 0 &&
    expressionSymbol !== void 0 &&
    isSameSymbol(
      resolveCanonicalSymbol(expressionSymbol, checker),
      resolveCanonicalSymbol(member.hostSymbol, checker),
    )
  ) {
    return true;
  }

  const property = checker.getPropertyOfType(
    checker.getNonNullableType(checker.getTypeAtLocation(expression)),
    member.memberName,
  );
  const declaredProperty = checker.getPropertyOfType(
    checker.getTypeAtLocation(member.hostDeclaration),
    member.memberName,
  );

  if (
    property !== void 0 &&
    (isSameSymbol(property, member.memberSymbol) ||
      (declaredProperty !== void 0 && isSameSymbol(property, declaredProperty)))
  ) {
    return true;
  }

  if (!ts.isCallExpression(expression)) {
    return false;
  }

  const declaration = checker
    .getResolvedSignature(expression)
    ?.getDeclaration();
  const body =
    declaration !== void 0 && "body" in declaration ? declaration.body : void 0;
  if (body === void 0) {
    return false;
  }
  if (!ts.isBlock(body)) {
    return carriesMember(body, checker, member, visitedExpressions);
  }

  const findReturnedMember = (node: ts.Node): boolean => {
    if (ts.isFunctionLike(node)) {
      return false;
    }
    return ts.isReturnStatement(node)
      ? node.expression !== void 0 &&
          carriesMember(node.expression, checker, member, visitedExpressions)
      : ts.forEachChild(node, findReturnedMember) === true;
  };

  return findReturnedMember(body);
};

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
    ? checker
        .getPropertiesOfType(type)
        .some(
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
 * @returns True when the expression contains the member or its host value.
 * @example
 * ```typescript
 * const carries = expressionCarriesMemberValue(value, checker, member);
 * ```
 */
const expressionCarriesMemberValue = (
  expression: ts.Expression,
  checker: ts.TypeChecker,
  member: PublicMember,
): boolean => {
  if (
    carriesMember(expression, checker, member) ||
    containsSerializedMember(
      checker.getTypeAtLocation(expression),
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
        ? expressionCarriesMemberValue(property.expression, checker, member)
        : (ts.isPropertyAssignment(property) &&
            expressionCarriesMemberValue(
              property.initializer,
              checker,
              member,
            )) ||
            (ts.isShorthandPropertyAssignment(property) &&
              expressionCarriesMemberValue(property.name, checker, member));
    });
  }

  return (
    ts.isArrayLiteralExpression(expression) &&
    expression.elements.some((element) =>
      expressionCarriesMemberValue(element, checker, member),
    )
  );
};

export {
  carriesMember,
  containsSerializedMember,
  expressionCarriesMemberValue,
};
