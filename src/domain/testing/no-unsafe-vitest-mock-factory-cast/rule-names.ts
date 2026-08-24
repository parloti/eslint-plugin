import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

/** Supported declaration shapes that can introduce top-level names. */
type NamedDeclaration =
  | TSESTree.ClassDeclaration
  | TSESTree.FunctionDeclaration
  | TSESTree.TSEnumDeclaration
  | TSESTree.TSInterfaceDeclaration
  | TSESTree.TSModuleDeclaration
  | TSESTree.TSTypeAliasDeclaration
  | TSESTree.VariableDeclaration;

/** Node types that introduce top-level names. */
const namedDeclarationTypes = new Set([
  AST_NODE_TYPES.ClassDeclaration,
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.TSEnumDeclaration,
  AST_NODE_TYPES.TSInterfaceDeclaration,
  AST_NODE_TYPES.TSModuleDeclaration,
  AST_NODE_TYPES.TSTypeAliasDeclaration,
  AST_NODE_TYPES.VariableDeclaration,
]);

/** Type-like declaration node types handled by the name collector. */
const typeLikeDeclarationTypes = new Set([
  AST_NODE_TYPES.TSEnumDeclaration,
  AST_NODE_TYPES.TSInterfaceDeclaration,
  AST_NODE_TYPES.TSTypeAliasDeclaration,
]);

/**
 * Collects declaration identifiers from top-level declarations.
 * @param declaration Declaration node.
 * @param names Output name set.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function collectDeclarationNames(
  declaration: NamedDeclaration,
  names: Set<string>,
): void {
  if (
    declaration.type === AST_NODE_TYPES.FunctionDeclaration ||
    declaration.type === AST_NODE_TYPES.ClassDeclaration
  ) {
    if (declaration.id !== null) {
      names.add(declaration.id.name);
    }
    return;
  }

  if (declaration.type === AST_NODE_TYPES.VariableDeclaration) {
    for (const variableDeclaration of declaration.declarations) {
      collectPatternNames(variableDeclaration.id, names);
    }
    return;
  }

  if (isTypeLikeDeclaration(declaration)) {
    names.add(declaration.id.name);
    return;
  }

  if (declaration.id.type === AST_NODE_TYPES.Identifier) {
    names.add(declaration.id.name);
  }
}

/**
 * Collects identifiers from a binding pattern.
 * @param pattern Binding pattern.
 * @param names Output name set.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
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
  }

  if (pattern.type === AST_NODE_TYPES.ObjectPattern) {
    for (const property of pattern.properties) {
      if (property.type === AST_NODE_TYPES.Property) {
        collectPatternNames(property.value, names);
      }

      if (property.type === AST_NODE_TYPES.RestElement) {
        collectPatternNames(property.argument, names);
      }
    }
  }
}

/**
 * Collects top-level binding names to avoid collisions with inserted imports.
 * @param statements Program statements.
 * @returns All top-level names in the file.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
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

    if (statement.type === AST_NODE_TYPES.ExportNamedDeclaration) {
      if (
        statement.declaration !== null &&
        isNamedDeclaration(statement.declaration)
      ) {
        collectDeclarationNames(statement.declaration, names);
      }
      continue;
    }

    if (statement.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
      if (isNamedDeclaration(statement.declaration)) {
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
 * Checks whether a node is a declaration that introduces top-level names.
 * @param node Node to inspect.
 * @returns True when the node is a supported declaration.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function isNamedDeclaration(
  node:
    | TSESTree.ExportDefaultDeclaration["declaration"]
    | TSESTree.ProgramStatement,
): node is NamedDeclaration {
  return namedDeclarationTypes.has(node.type);
}

/**
 * Checks whether a declaration introduces a type-like top-level name.
 * @param declaration Declaration to inspect.
 * @returns True when the declaration is a type alias, interface, or enum.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function isTypeLikeDeclaration(
  declaration: NamedDeclaration,
): declaration is
  | TSESTree.TSEnumDeclaration
  | TSESTree.TSInterfaceDeclaration
  | TSESTree.TSTypeAliasDeclaration {
  return typeLikeDeclarationTypes.has(declaration.type);
}

export { collectTopLevelNames };
