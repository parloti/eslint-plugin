import type * as ESTree from "estree";

import type { RuleMatch } from "./types";

/**
 * Adds identifier names from a binding pattern.
 * @param pattern Binding pattern.
 * @param names Output binding name set.
 * @example
 * ```typescript
 * const names = new Set<string>();
 * collectPatternNames({ name: "x", type: "Identifier" }, names);
 * ```
 */
function collectPatternNames(
  pattern: ESTree.Pattern,
  names: Set<string>,
): void {
  switch (pattern.type) {
    case "ArrayPattern": {
      for (const element of pattern.elements) {
        if (element !== null) {
          collectPatternNames(element, names);
        }
      }
      return;
    }

    case "AssignmentPattern": {
      collectPatternNames(pattern.left, names);
      return;
    }

    case "Identifier": {
      names.add(pattern.name);
      return;
    }

    case "ObjectPattern": {
      for (const property of pattern.properties) {
        if (property.type === "RestElement") {
          collectPatternNames(property.argument, names);
        } else {
          collectPatternNames(property.value, names);
        }
      }
      return;
    }

    case "RestElement": {
      collectPatternNames(pattern.argument, names);
      return;
    }
  }
}

/**
 * Adds top-level binding names from a statement.
 * @param statement Top-level statement.
 * @param names Output binding name set.
 * @example
 * ```typescript
 * const names = new Set<string>();
 * collectStatementBindingNames({ type: "EmptyStatement" } as never, names);
 * ```
 */
function collectStatementBindingNames(
  statement: ESTree.Program["body"][number],
  names: Set<string>,
): void {
  if (statement.type === "ImportDeclaration") {
    for (const specifier of statement.specifiers) {
      names.add(specifier.local.name);
    }
    return;
  }

  if (statement.type === "VariableDeclaration") {
    for (const declaration of statement.declarations) {
      collectPatternNames(declaration.id, names);
    }
    return;
  }

  if (statement.type === "FunctionDeclaration") {
    names.add(statement.id.name);
    return;
  }

  if (statement.type === "ClassDeclaration") {
    names.add(statement.id.name);
  }
}

/**
 * Collects top-level bound identifier names.
 * @param program Program node.
 * @returns Top-level binding names.
 * @example
 * ```typescript
 * const names = collectTopLevelBoundNames({ body: [], sourceType: "module", type: "Program" } as never);
 * void names;
 * ```
 */
function collectTopLevelBoundNames(program: ESTree.Program): Set<string> {
  const names = new Set<string>();

  for (const statement of program.body) {
    collectStatementBindingNames(statement, names);
  }

  return names;
}

/**
 * Returns true when import generation for this match could create an unsafe top-level collision.
 * @param program Program node.
 * @param moduleSpecifier Module specifier used by the mock.
 * @param bindings Candidate bindings.
 * @param declarations Known declarations by local name.
 * @returns True when the matcher should skip this candidate.
 * @example
 * ```typescript
 * const unsafe = hasUnsafeImportCollisions({ body: [], sourceType: "module", type: "Program" } as never, "./mod", []);
 * void unsafe;
 * ```
 */
function hasUnsafeImportCollisions(
  program: ESTree.Program,
  moduleSpecifier: string,
  bindings: RuleMatch["bindings"],
  declarations: RuleMatch["declarations"],
): boolean {
  const requestedExports = new Set(
    bindings.map((binding) => binding.exportedName),
  );

  const topLevelBoundNames = collectTopLevelBoundNames(program);
  const removableLocalNames = new Set(
    bindings
      .map((binding) => binding.localName)
      .filter((localName) => declarations.has(localName)),
  );
  const safelyBoundByTargetImport = new Set<string>();

  for (const statement of program.body) {
    if (
      statement.type === "ImportDeclaration" &&
      statement.source.value === moduleSpecifier &&
      hasUnsafeTargetImportSpecifiers(
        statement.specifiers,
        requestedExports,
        safelyBoundByTargetImport,
      )
    ) {
      return true;
    }
  }

  for (const exportedName of requestedExports) {
    if (
      topLevelBoundNames.has(exportedName) &&
      !safelyBoundByTargetImport.has(exportedName) &&
      !removableLocalNames.has(exportedName)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a target-module import contains unsafe specifiers.
 * @param specifiers Specifiers from an import matching the mocked module.
 * @param requestedExports Export names that must be imported.
 * @param safelyBoundByTargetImport Names safely bound by same-name imports.
 * @returns True when any specifier would create an unsafe binding.
 * @example
 * ```typescript
 * const unsafe = hasUnsafeTargetImportSpecifiers([], new Set(), new Set());
 * void unsafe;
 * ```
 */
function hasUnsafeTargetImportSpecifiers(
  specifiers: ESTree.ImportDeclaration["specifiers"],
  requestedExports: ReadonlySet<string>,
  safelyBoundByTargetImport: Set<string>,
): boolean {
  for (const specifier of specifiers) {
    if (specifier.type !== "ImportSpecifier") {
      continue;
    }

    if (specifier.imported.type !== "Identifier") {
      return true;
    }

    const importedName = specifier.imported.name;
    const localName = specifier.local.name;
    if (importedName !== localName && requestedExports.has(importedName)) {
      return true;
    }

    if (importedName === localName) {
      safelyBoundByTargetImport.add(importedName);
    }
  }

  return false;
}

export { hasUnsafeImportCollisions };
