import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";

import {
  isSameSymbol,
  resolveCanonicalSymbol,
} from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { getSourceReferenceSymbol } from "../program-analysis";
import { getUsageType } from "./member-operation-type-utilities";
import { hasCompatibleMemberShape } from "./member-usage-type-utilities";

const MEMBER_SYMBOL_FLAGS =
  ts.SymbolFlags.Property |
  ts.SymbolFlags.Method |
  ts.SymbolFlags.GetAccessor |
  ts.SymbolFlags.SetAccessor;

const getUsageSymbol = (
  node: ts.Node,
  checker: ts.TypeChecker,
  program: ts.Program,
): ts.Symbol | undefined => {
  const parent = node.parent;
  if (
    ts.isIdentifier(node) &&
    ts.isBindingElement(parent) &&
    parent.name === node &&
    parent.propertyName === void 0 &&
    ts.isObjectBindingPattern(parent.parent)
  ) {
    const owner = parent.parent.parent;
    const sourceType = ts.isVariableDeclaration(owner)
      ? owner.initializer === void 0
        ? void 0
        : getUsageType(owner.initializer, checker)
      : ts.isParameter(owner)
        ? getUsageType(owner, checker)
        : void 0;
    return sourceType === void 0
      ? getSourceReferenceSymbol(program, node)
      : checker.getPropertyOfType(sourceType, node.text);
  }
  return getSourceReferenceSymbol(program, node);
};

/**
 * Resolves member identity while preserving destructuring-specific semantics.
 * @param node Candidate reference.
 * @param checker Semantic checker for the program.
 * @param program Active TypeScript snapshot.
 * @returns Property or method symbol, excluding unrelated local variables.
 * @example
 * ```typescript
 * const symbol = getReferencedMemberSymbol(reference, checker, program);
 * ```
 */
const getReferencedMemberSymbol = (
  node: ts.Node,
  checker: ts.TypeChecker,
  program: ts.Program,
): ts.Symbol | undefined => {
  const symbol = getUsageSymbol(node, checker, program);
  return symbol === void 0 || (symbol.flags & MEMBER_SYMBOL_FLAGS) === 0
    ? void 0
    : symbol;
};

/** Source type and name for a property access or destructuring read. */
interface PropertyAccessDetails {
  /** Property name selected by the access. */
  name: string;

  /** Type of the object whose property is read. */
  sourceType: ts.Type;
}

/**
 * Gets the source type and key for a property read or destructuring use.
 * @param node Candidate member-name node.
 * @param checker TypeScript type checker.
 * @returns Access details when the node reads a property.
 * @example
 * ```typescript
 * const access = getPropertyAccess(node, checker);
 * ```
 */
const getPropertyAccess = (
  node: ts.Node,
  checker: ts.TypeChecker,
): PropertyAccessDetails | undefined => {
  const parent = node.parent;

  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return {
      name: parent.name.text,
      sourceType: getUsageType(parent.expression, checker),
    };
  }

  if (
    ts.isBindingElement(parent) &&
    (parent.name === node || parent.propertyName === node) &&
    ts.isObjectBindingPattern(parent.parent)
  ) {
    const owner = parent.parent.parent;
    const sourceType = ts.isVariableDeclaration(owner)
      ? getUsageType(owner.initializer ?? owner.name, checker)
      : ts.isParameter(owner)
        ? getUsageType(owner, checker)
        : void 0;
    const nameNode = parent.propertyName ?? parent.name;

    return sourceType === void 0
      ? void 0
      : ts.isIdentifier(nameNode) || ts.isStringLiteralLike(nameNode)
        ? { name: nameNode.text, sourceType }
        : void 0;
  }

  return void 0;
};

/**
 * Checks whether a property read uses a structurally related host shape.
 * @param node Candidate read node.
 * @param checker TypeScript type checker.
 * @param member Member whose usage is being checked.
 * @returns True when the read resolves through a structural contract.
 * @example
 * ```typescript
 * const used = isStructuralPropertyRead(node, checker, member);
 * ```
 */
const isStructuralPropertyRead = (
  node: ts.Node,
  checker: ts.TypeChecker,
  member: PublicMember,
): boolean => {
  const access = getPropertyAccess(node, checker);

  return (
    access !== void 0 &&
    access.name === member.memberName &&
    hasCompatibleMemberShape(access.sourceType, member, checker)
  );
};

/**
 * Gets the literal string keys represented by a TypeScript key type.
 * @param type Key type from an element access expression.
 * @returns Literal keys represented by the type.
 * @example
 * ```typescript
 * const keys = getStringLiteralKeys(keyType);
 * ```
 */
const getStringLiteralKeys = (type: ts.Type): string[] => {
  if (type.isUnionOrIntersection()) {
    return type.types.flatMap((part) => getStringLiteralKeys(part));
  }

  if ((type.flags & ts.TypeFlags.StringLiteral) !== 0) {
    return [(type as ts.StringLiteralType).value];
  }

  return (type.flags & ts.TypeFlags.NumberLiteral) === 0
    ? []
    : [(type as ts.NumberLiteralType).value.toFixed(0)];
};

/**
 * Checks whether a computed property access resolves to a member symbol.
 * @param node Candidate element access expression.
 * @param checker TypeScript type checker.
 * @param member Member whose usage is being checked.
 * @param relatedSymbols Member and contract symbols accepted as usage.
 * @returns True when a resolved key selects the member.
 * @example
 * ```typescript
 * const used = isComputedMemberRead(node, checker, member, relatedSymbols);
 * ```
 */
const isComputedMemberRead = (
  node: ts.Node,
  checker: ts.TypeChecker,
  member: PublicMember,
  relatedSymbols: ts.Symbol[],
): boolean => {
  if (!ts.isElementAccessExpression(node)) {
    return false;
  }

  const objectType = getUsageType(node.expression, checker);
  const keyType = getUsageType(node.argumentExpression, checker);

  if (
    (keyType.flags & ts.TypeFlags.String) !== 0 &&
    ts.isVariableDeclaration(member.hostDeclaration) &&
    member.hostSymbol !== void 0
  ) {
    const accessedSymbol = checker.getSymbolAtLocation(node.expression);

    if (
      accessedSymbol !== void 0 &&
      isSameSymbol(
        resolveCanonicalSymbol(accessedSymbol, checker),
        resolveCanonicalSymbol(member.hostSymbol, checker),
      )
    ) {
      return true;
    }
  }

  return getStringLiteralKeys(keyType).some((name) => {
    if (name !== member.memberName) {
      return false;
    }

    const property = checker.getPropertyOfType(objectType, name);

    return (
      property !== void 0 &&
      (relatedSymbols.some((symbol) => isSameSymbol(symbol, property)) ||
        hasCompatibleMemberShape(objectType, member, checker))
    );
  });
};

export {
  getReferencedMemberSymbol,
  getStringLiteralKeys,
  isComputedMemberRead,
  isStructuralPropertyRead,
};
