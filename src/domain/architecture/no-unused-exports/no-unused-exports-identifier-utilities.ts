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
    if (ts.isTypeQueryNode(current)) {
      return false;
    }

    if (ts.isTypeNode(current)) {
      return true;
    }

    if (
      ts.isExpressionStatement(current) ||
      ts.isCallExpression(current) ||
      ts.isPropertyAccessExpression(current) ||
      ts.isElementAccessExpression(current) ||
      ts.isVariableDeclaration(current) ||
      ts.isReturnStatement(current)
    ) {
      return false;
    }

    if (ts.isSourceFile(current)) {
      return false;
    }

    return visitNode(current.parent);
  };

  return visitNode(identifier);
};

/**
 * Checks whether one identifier is one concrete usage candidate for the export kind.
 * @param identifier Identifier node.
 * @param exportKind Whether type-only or value usage is required.
 * @returns True when the identifier can satisfy usage.
 * @example
 * ```typescript
 * const concrete = isConcreteUsageIdentifier(identifier, "value");
 * ```
 */
const isConcreteUsageIdentifier = (
  identifier: ts.Identifier,
  exportKind: ExportKind,
): boolean => {
  if (isDeclarationOnlyIdentifier(identifier)) {
    return false;
  }

  const isInTypePosition = isTypePositionIdentifier(identifier);

  return exportKind === "type" ? isInTypePosition : !isInTypePosition;
};

export { getTypeScriptProgram, isConcreteUsageIdentifier };
