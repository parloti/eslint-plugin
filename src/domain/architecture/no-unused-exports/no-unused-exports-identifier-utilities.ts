import type { Rule } from "eslint";

import { ESLintUtils } from "@typescript-eslint/utils";
import * as ts from "typescript";

import type { ExportKind } from "./types";

/**
 * Resolves TypeScript parser services program when available.
 * @param context Rule context.
 * @returns TypeScript program when available.
 * @example
 * ```typescript
 * const program = getTypeScriptProgram(context);
 * ```
 */
const getTypeScriptProgram = (
  context: Rule.RuleContext,
): ts.Program | undefined => {
  try {
    const services = ESLintUtils.getParserServices(context as never);
    return services.program;
  } catch {
    return void 0;
  }
};

/**
 * Checks whether an identifier participates in one declaration/import/export site.
 * @param identifier Identifier node to evaluate.
 * @returns True when the identifier is declaration-only syntax.
 * @example
 * ```typescript
 * const declaration = isDeclarationOnlyIdentifier(identifier);
 * ```
 */
const isDeclarationOnlyIdentifier = (identifier: ts.Identifier): boolean => {
  const parent = identifier.parent;

  return (
    ts.isImportSpecifier(parent) ||
    ts.isImportClause(parent) ||
    ts.isNamespaceImport(parent) ||
    ts.isImportEqualsDeclaration(parent) ||
    ts.isExportSpecifier(parent) ||
    ts.isTypeAliasDeclaration(parent) ||
    ts.isInterfaceDeclaration(parent) ||
    ts.isTypeParameterDeclaration(parent) ||
    (ts.isVariableDeclaration(parent) && parent.name === identifier) ||
    (ts.isFunctionDeclaration(parent) && parent.name === identifier) ||
    (ts.isClassDeclaration(parent) && parent.name === identifier) ||
    (ts.isParameter(parent) && parent.name === identifier)
  );
};

/**
 * Checks whether one node is the base expression of a class `extends` clause.
 * @param node Candidate node.
 * @returns True when the node is evaluated at runtime as a class base.
 * @example
 * ```typescript
 * const classBase = isClassExtendsExpression(node);
 * ```
 */
const isClassExtendsExpression = (node: ts.Node): boolean =>
  ts.isExpressionWithTypeArguments(node) &&
  ts.isHeritageClause(node.parent) &&
  node.parent.token === ts.SyntaxKind.ExtendsKeyword &&
  ts.isClassLike(node.parent.parent);

/**
 * Checks whether one identifier node appears under a type node.
 * @param identifier Candidate identifier.
 * @returns True when the identifier is inside type-only syntax.
 * @example
 * ```typescript
 * const typePosition = isTypePositionIdentifier(identifier);
 * ```
 */
const isTypePositionIdentifier = (identifier: ts.Identifier): boolean => {
  const visitNode = (current: ts.Node): boolean => {
    if (ts.isTypeQueryNode(current) || isClassExtendsExpression(current)) {
      return false;
    }

    if (ts.isTypeNode(current)) {
      return true;
    }

    const isValuePosition =
      ts.isExpressionStatement(current) ||
      ts.isCallExpression(current) ||
      ts.isPropertyAccessExpression(current) ||
      ts.isElementAccessExpression(current) ||
      ts.isVariableDeclaration(current) ||
      ts.isReturnStatement(current) ||
      ts.isSourceFile(current);

    return !isValuePosition && visitNode(current.parent);
  };

  return visitNode(identifier);
};

/** Syntax position that can satisfy one export usage. */
type UsagePosition = "any" | ExportKind;

/**
 * Resolves which syntax positions consume one exported symbol.
 * @param exportKind Export kind declared by the export site.
 * @param symbol Canonical exported symbol.
 * @returns `any` for value exports that also declare a type, such as classes and enums.
 * @example
 * ```typescript
 * const position = resolveUsagePosition("value", classSymbol);
 * ```
 */
const resolveUsagePosition = (
  exportKind: ExportKind,
  symbol: ts.Symbol,
): UsagePosition => {
  const declaresTypeAndValue =
    (symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Enum)) !== 0;

  return exportKind === "value" && declaresTypeAndValue ? "any" : exportKind;
};

/**
 * Checks whether one identifier is one concrete usage candidate for the usage position.
 * @param identifier Identifier node.
 * @param usagePosition Whether type, value, or either usage is required.
 * @returns True when the identifier can satisfy usage.
 * @example
 * ```typescript
 * const concrete = isConcreteUsageIdentifier(identifier, "value");
 * ```
 */
const isConcreteUsageIdentifier = (
  identifier: ts.Identifier,
  usagePosition: UsagePosition,
): boolean => {
  if (isDeclarationOnlyIdentifier(identifier)) {
    return false;
  }

  if (usagePosition === "any") {
    return true;
  }

  const isInTypePosition = isTypePositionIdentifier(identifier);

  return usagePosition === "type" ? isInTypePosition : !isInTypePosition;
};

export {
  getTypeScriptProgram,
  isConcreteUsageIdentifier,
  resolveUsagePosition,
};
