import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

import type { ScopeManager } from "./types";

/** Declaration shapes that introduce names at module scope. */
type NamedDeclaration =
  | TSESTree.ClassDeclaration
  | TSESTree.FunctionDeclaration
  | TSESTree.TSDeclareFunction
  | TSESTree.TSEnumDeclaration
  | TSESTree.TSInterfaceDeclaration
  | TSESTree.TSModuleDeclaration
  | TSESTree.TSTypeAliasDeclaration
  | TSESTree.VariableDeclaration;

const namedDeclarationTypes = new Set<string>([
  AST_NODE_TYPES.ClassDeclaration,
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.TSDeclareFunction,
  AST_NODE_TYPES.TSEnumDeclaration,
  AST_NODE_TYPES.TSInterfaceDeclaration,
  AST_NODE_TYPES.TSModuleDeclaration,
  AST_NODE_TYPES.TSTypeAliasDeclaration,
  AST_NODE_TYPES.VariableDeclaration,
]);

/**
 * Adds names introduced by one supported top-level declaration.
 * @param declaration Top-level declaration to inspect.
 * @param names Mutable output set.
 * @example
 * ```typescript
 * collectDeclarationNames(declaration, names);
 * ```
 */
function collectDeclarationNames(
  declaration: NamedDeclaration,
  names: Set<string>,
): void {
  if (declaration.type === AST_NODE_TYPES.VariableDeclaration) {
    for (const variable of declaration.declarations) {
      collectPatternNames(variable.id, names);
    }
    return;
  }

  if (
    "id" in declaration &&
    declaration.id !== null &&
    declaration.id.type === AST_NODE_TYPES.Identifier
  ) {
    names.add(declaration.id.name);
  }
}

/**
 * Adds identifiers introduced by a top-level binding pattern.
 * @param pattern Binding pattern to inspect.
 * @param names Mutable output set.
 * @example
 * ```typescript
 * collectPatternNames(pattern, names);
 * ```
 */
function collectPatternNames(pattern: TSESTree.Node, names: Set<string>): void {
  if (pattern.type === AST_NODE_TYPES.Identifier) {
    names.add(pattern.name);
    return;
  }

  if (pattern.type === AST_NODE_TYPES.AssignmentPattern) {
    collectPatternNames(pattern.left, names);
    return;
  }

  if (pattern.type === AST_NODE_TYPES.RestElement) {
    collectPatternNames(pattern.argument, names);
    return;
  }

  if (pattern.type === AST_NODE_TYPES.ArrayPattern) {
    for (const element of pattern.elements) {
      if (element !== null) {
        collectPatternNames(element, names);
      }
    }
    return;
  }

  if (pattern.type === AST_NODE_TYPES.ObjectPattern) {
    for (const property of pattern.properties) {
      collectPatternNames(
        property.type === AST_NODE_TYPES.Property
          ? property.value
          : property.argument,
        names,
      );
    }
  }
}

/**
 * Collects declarations from every lexical scope in a source file.
 * @param scopeManager Parser scope information.
 * @returns Names that could capture a generated type reference.
 * @example
 * ```typescript
 * const names = collectScopeNames(sourceCode.scopeManager);
 * ```
 */
function collectScopeNames(
  scopeManager: ScopeManager | undefined,
): Set<string> {
  const names = new Set<string>();
  const scopes = scopeManager?.scopes ?? [];

  for (const scope of scopes) {
    const variables = scope.variables ?? [];

    for (const variable of variables) {
      if (typeof variable.name === "string") {
        names.add(variable.name);
      }
    }
  }

  return names;
}

/**
 * Collects all import, value, and type names declared at module scope.
 * @param statements Program statements to inspect.
 * @returns Names already declared at module scope.
 * @example
 * ```typescript
 * const names = collectTopLevelNames(program.body);
 * ```
 */
function collectTopLevelNames(statements: readonly unknown[]): Set<string> {
  const names = new Set<string>();

  for (const statement of statements as TSESTree.ProgramStatement[]) {
    if (statement.type === AST_NODE_TYPES.ImportDeclaration) {
      for (const specifier of statement.specifiers) {
        names.add(specifier.local.name);
      }
      continue;
    }

    if (
      statement.type === AST_NODE_TYPES.ExportNamedDeclaration ||
      statement.type === AST_NODE_TYPES.ExportDefaultDeclaration
    ) {
      if (
        statement.declaration !== null &&
        isNamedDeclaration(statement.declaration)
      ) {
        collectDeclarationNames(statement.declaration, names);
      }
      continue;
    }

    if (isNamedDeclaration(statement)) {
      collectDeclarationNames(statement, names);
    }
  }

  return names;
}

/**
 * Checks whether a program statement contains a supported declaration.
 * @param node Program node to inspect.
 * @returns Whether the node is a supported declaration.
 * @example
 * ```typescript
 * const named = isNamedDeclaration(statement);
 * ```
 */
function isNamedDeclaration(node: TSESTree.Node): node is NamedDeclaration {
  return namedDeclarationTypes.has(node.type);
}

export { collectScopeNames, collectTopLevelNames };
