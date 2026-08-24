import type * as ESTree from "estree";

/** Minimal declaration shape that may carry an identifier binding. */
interface DeclarationWithIdentifier {
  /** Declaration identifier if one exists. */
  id?: ESTree.Pattern | null;
}

/** Optional import-kind carrier shape used for type-only checks. */
interface ImportKindCarrier {
  /** ESTree-compatible import kind value. */
  importKind?: "type" | "value";
}

/**
 * Adds all identifier names introduced by one binding pattern.
 * @param pattern Binding pattern to inspect.
 * @param boundNames Destination set.
 * @example
 * ```typescript
 * addPatternBoundNames(variable.id, names);
 * ```
 */
const addPatternBoundNames = (
  pattern: ESTree.Pattern,
  boundNames: Set<string>,
): void => {
  if (pattern.type === "Identifier") {
    boundNames.add(pattern.name);
    return;
  }

  if (pattern.type === "RestElement") {
    addPatternBoundNames(pattern.argument, boundNames);
    return;
  }

  if (pattern.type === "AssignmentPattern") {
    addPatternBoundNames(pattern.left, boundNames);
    return;
  }

  if (pattern.type === "ObjectPattern") {
    for (const property of pattern.properties) {
      if (property.type === "RestElement") {
        addPatternBoundNames(property.argument, boundNames);
        continue;
      }

      addPatternBoundNames(property.value, boundNames);
    }

    return;
  }

  if (pattern.type === "ArrayPattern") {
    for (const element of pattern.elements) {
      if (element !== null) {
        addPatternBoundNames(element, boundNames);
      }
    }
  }
};

/**
 * Adds one declaration identifier name when present.
 * @param declaration Declaration that may bind an identifier.
 * @param boundNames Destination set.
 * @example
 * ```typescript
 * addDeclarationIdentifierBoundName(declaration, names);
 * ```
 */
const addDeclarationIdentifierBoundName = (
  declaration: DeclarationWithIdentifier,
  boundNames: Set<string>,
): void => {
  if (declaration.id !== null && declaration.id !== void 0) {
    addPatternBoundNames(declaration.id, boundNames);
  }
};

/**
 * Adds bound variable names from one variable declaration.
 * @param declaration Variable declaration to inspect.
 * @param boundNames Destination set.
 * @example
 * ```typescript
 * addVariableBoundNames(declaration, names);
 * ```
 */
const addVariableBoundNames = (
  declaration: ESTree.VariableDeclaration,
  boundNames: Set<string>,
): void => {
  for (const variable of declaration.declarations) {
    addPatternBoundNames(variable.id, boundNames);
  }
};

/**
 * Adds bound names from one export declaration.
 * @param statement Export declaration to inspect.
 * @param boundNames Destination set.
 * @example
 * ```typescript
 * addExportedDeclarationBoundNames(statement, names);
 * ```
 */
const addExportedDeclarationBoundNames = (
  statement: ESTree.ExportDefaultDeclaration | ESTree.ExportNamedDeclaration,
  boundNames: Set<string>,
): void => {
  if (statement.type === "ExportDefaultDeclaration") {
    if (
      statement.declaration.type === "FunctionDeclaration" ||
      statement.declaration.type === "ClassDeclaration"
    ) {
      addDeclarationIdentifierBoundName(statement.declaration, boundNames);
    }

    return;
  }

  const { declaration } = statement;

  if (declaration === null || declaration === void 0) {
    return;
  }

  if (declaration.type === "VariableDeclaration") {
    addVariableBoundNames(declaration, boundNames);
  } else {
    addDeclarationIdentifierBoundName(declaration, boundNames);
  }
};

/**
 * Adds all bound names introduced by one program statement.
 * @param statement Program statement to inspect.
 * @param boundNames Destination set.
 * @example
 * ```typescript
 * addStatementBoundNames(statement, names);
 * ```
 */
const addStatementBoundNames = (
  statement: ESTree.Program["body"][number],
  boundNames: Set<string>,
): void => {
  switch (statement.type) {
    case "ClassDeclaration":
    case "FunctionDeclaration": {
      addDeclarationIdentifierBoundName(statement, boundNames);
      break;
    }

    case "ExportDefaultDeclaration":
    case "ExportNamedDeclaration": {
      addExportedDeclarationBoundNames(statement, boundNames);
      break;
    }

    case "ImportDeclaration": {
      const declarationImportKind = (statement as ImportKindCarrier).importKind;

      for (const specifier of statement.specifiers) {
        const specifierImportKind = (specifier as ImportKindCarrier).importKind;
        const isTypeOnly =
          declarationImportKind === "type" || specifierImportKind === "type";

        if (!isTypeOnly) {
          boundNames.add(specifier.local.name);
        }
      }

      break;
    }

    case "VariableDeclaration": {
      addVariableBoundNames(statement, boundNames);
      break;
    }

    // No default
  }
};

/**
 * Collects bound names available for collision detection.
 * @param body Program body statements.
 * @returns Bound names in the file.
 * @example
 * ```typescript
 * const names = collectBoundNames(program.body);
 * ```
 */
const collectBoundNames = (body: ESTree.Program["body"]): Set<string> => {
  const boundNames = new Set<string>();

  for (const statement of body) {
    addStatementBoundNames(statement, boundNames);
  }

  return boundNames;
};

/** Companion marker for module isolation. */
export { collectBoundNames };
