import type { Rule } from "eslint";
import type * as ESTree from "estree";

/** Tracks one aliased specifier candidate in a program. */
interface AliasedSpecifierCandidate {
  /** Identifier name before aliasing (e.g. A in A as B). */
  originalName: string;

  /** Specifier node to report when aliasing is not allowed. */
  specifier: ESTree.ExportSpecifier | ESTree.ImportSpecifier;
}

/** Minimal declaration shape that may carry an identifier binding. */
interface DeclarationWithIdentifier {
  /** Declaration identifier if one exists. */
  id?: ESTree.Pattern | null;
}

/** Optional export-kind carrier shape used for type-only checks. */
interface ExportKindCarrier {
  /** ESTree-compatible export kind value. */
  exportKind?: "type" | "value";
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
      if (property.type === "Property") {
        addPatternBoundNames(property.value, boundNames);
      }

      if (property.type === "RestElement") {
        addPatternBoundNames(property.argument, boundNames);
      }
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
    if (statement.type === "ImportDeclaration") {
      const declarationImportKind = (statement as ImportKindCarrier).importKind;

      for (const specifier of statement.specifiers) {
        const specifierImportKind = (specifier as ImportKindCarrier).importKind;
        const isTypeOnly =
          declarationImportKind === "type" || specifierImportKind === "type";

        if (!isTypeOnly) {
          boundNames.add(specifier.local.name);
        }
      }
    }

    if (statement.type === "VariableDeclaration") {
      addVariableBoundNames(statement, boundNames);
    }

    if (statement.type === "FunctionDeclaration") {
      addDeclarationIdentifierBoundName(statement, boundNames);
    }

    if (statement.type === "ClassDeclaration") {
      addDeclarationIdentifierBoundName(statement, boundNames);
    }

    if (
      statement.type === "ExportNamedDeclaration" &&
      statement.declaration !== null &&
      statement.declaration !== void 0 &&
      statement.declaration.type === "VariableDeclaration"
    ) {
      addVariableBoundNames(statement.declaration, boundNames);
    }

    if (
      statement.type === "ExportNamedDeclaration" &&
      statement.declaration !== null &&
      statement.declaration !== void 0 &&
      statement.declaration.type === "FunctionDeclaration"
    ) {
      addDeclarationIdentifierBoundName(statement.declaration, boundNames);
    }

    if (
      statement.type === "ExportNamedDeclaration" &&
      statement.declaration !== null &&
      statement.declaration !== void 0 &&
      statement.declaration.type === "ClassDeclaration"
    ) {
      addDeclarationIdentifierBoundName(statement.declaration, boundNames);
    }

    if (
      statement.type === "ExportDefaultDeclaration" &&
      statement.declaration.type === "FunctionDeclaration"
    ) {
      addDeclarationIdentifierBoundName(statement.declaration, boundNames);
    }

    if (
      statement.type === "ExportDefaultDeclaration" &&
      statement.declaration.type === "ClassDeclaration"
    ) {
      addDeclarationIdentifierBoundName(statement.declaration, boundNames);
    }
  }

  return boundNames;
};

/**
 * Collects aliased named import specifiers from one import declaration.
 * @param declaration Import declaration to inspect.
 * @returns Aliased import specifier candidates.
 * @example
 * ```typescript
 * const candidates = collectImportAliasCandidates(declaration);
 * ```
 */
const collectImportAliasCandidates = (
  declaration: ESTree.ImportDeclaration,
): AliasedSpecifierCandidate[] => {
  const candidates: AliasedSpecifierCandidate[] = [];
  const declarationImportKind = (declaration as ImportKindCarrier).importKind;

  for (const specifier of declaration.specifiers) {
    const specifierImportKind = (specifier as ImportKindCarrier).importKind;
    const isTypeOnly =
      declarationImportKind === "type" || specifierImportKind === "type";

    if (
      !isTypeOnly &&
      specifier.type === "ImportSpecifier" &&
      specifier.imported.type === "Identifier" &&
      specifier.local.name !== specifier.imported.name
    ) {
      candidates.push({
        originalName: specifier.imported.name,
        specifier,
      });
    }
  }

  return candidates;
};

/**
 * Collects aliased named export specifiers from one export declaration.
 * @param declaration Export declaration to inspect.
 * @returns Aliased export specifier candidates.
 * @example
 * ```typescript
 * const candidates = collectExportAliasCandidates(declaration);
 * ```
 */
const collectExportAliasCandidates = (
  declaration: ESTree.ExportNamedDeclaration,
): AliasedSpecifierCandidate[] => {
  const candidates: AliasedSpecifierCandidate[] = [];
  const declarationExportKind = (declaration as ExportKindCarrier).exportKind;

  for (const specifier of declaration.specifiers) {
    const specifierExportKind = (specifier as ExportKindCarrier).exportKind;
    const isTypeOnly =
      declarationExportKind === "type" || specifierExportKind === "type";

    if (
      !isTypeOnly &&
      specifier.local.type === "Identifier" &&
      specifier.exported.type === "Identifier" &&
      specifier.local.name !== specifier.exported.name
    ) {
      candidates.push({
        originalName: specifier.local.name,
        specifier,
      });
    }
  }

  return candidates;
};

/**
 * Collects aliased import/export named specifiers.
 * @param body Program body statements.
 * @returns Aliased named import/export specifiers.
 * @example
 * ```typescript
 * const candidates = collectAliasedSpecifiers(program.body);
 * ```
 */
const collectAliasedSpecifiers = (
  body: ESTree.Program["body"],
): AliasedSpecifierCandidate[] => {
  const candidates: AliasedSpecifierCandidate[] = [];

  for (const statement of body) {
    if (statement.type === "ImportDeclaration") {
      candidates.push(...collectImportAliasCandidates(statement));
    }

    if (statement.type === "ExportNamedDeclaration") {
      candidates.push(...collectExportAliasCandidates(statement));
    }
  }

  return candidates;
};

/**
 * Builds a listener for this rule.
 * @param context Rule execution context.
 * @returns Listener for import/export alias checks.
 * @example
 * ```typescript
 * const listener = buildListener(context);
 * ```
 */
const buildListener = (context: Rule.RuleContext): Rule.RuleListener => ({
  Program(node: ESTree.Program): void {
    const boundNames = collectBoundNames(node.body);
    const aliasedSpecifiers = collectAliasedSpecifiers(node.body);

    for (const candidate of aliasedSpecifiers) {
      if (!boundNames.has(candidate.originalName)) {
        context.report({
          messageId: "aliasNotAllowed",
          node: candidate.specifier,
        });
      }
    }
  },
});

/** ESLint rule that forbids aliased import/export names unless required by same-file name collisions. */
const noImportExportAliasesRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return buildListener(context);
  },
  meta: {
    docs: {
      description:
        "Forbid aliased import/export names unless the original name is already bound in the same file.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/no-import-export-aliases.md",
    },
    messages: {
      aliasNotAllowed:
        "Avoid aliased import/export names unless the original name is already bound in this file.",
    },
    schema: [],
    type: "problem",
  },
};

export { noImportExportAliasesRule };
