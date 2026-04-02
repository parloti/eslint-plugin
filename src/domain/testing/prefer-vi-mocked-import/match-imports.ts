import type * as ESTree from "estree";

import type { Range } from "./match-helpers";
import type { ImportPlan } from "./types";

import { hasRange } from "./match-helpers";

/**
 * Type definition for rule data.
 * @example
 * ```typescript
 * const declaration = {} as RangedImportDeclaration;
 * void declaration;
 * ```
 */
interface RangedImportDeclaration extends ESTree.ImportDeclaration {
  /** Import declaration source range. */
  range: Range;
}

/**
 * Builds an import plan for insertion mode.
 * @param moduleSpecifier Target module path.
 * @param names Names to import.
 * @param afterRange Range to insert after.
 * @returns Insert plan payload.
 * @example
 * ```typescript
 * const plan = createInsertPlan("./x", ["a"], [0, 1]);
 * void plan;
 * ```
 */
function createInsertPlan(
  moduleSpecifier: string,
  names: string[],
  afterRange: Range | undefined,
): ImportPlan {
  return afterRange === void 0
    ? { insert: {}, moduleSpecifier, names }
    : { insert: { afterRange }, moduleSpecifier, names };
}

/**
 * Builds an import plan for update mode.
 * @param statement Existing import declaration.
 * @param moduleSpecifier Target module path.
 * @param names Names to import.
 * @returns Update plan payload.
 * @example
 * ```typescript
 * const plan = createUpdatePlan({ specifiers: [], source: { type: "Literal", value: "./x" }, type: "ImportDeclaration", range: [0, 1] } as never, "./x", ["a"]);
 * void plan;
 * ```
 */
function createUpdatePlan(
  statement: RangedImportDeclaration,
  moduleSpecifier: string,
  names: string[],
): ImportPlan {
  if (hasNamespaceImport(statement)) {
    return createInsertPlan(moduleSpecifier, names, statement.range);
  }

  const defaultImportName = getDefaultImportName(statement);
  const baseUpdate = {
    existingNamedImports: getNamedImports(statement),
    range: statement.range,
  };
  const update =
    defaultImportName === void 0
      ? baseUpdate
      : { ...baseUpdate, defaultImportName };

  return {
    moduleSpecifier,
    names,
    update,
  };
}

/**
 * Returns the default import local name.
 * @param statement Import declaration.
 * @returns Default local name when present.
 * @example
 * ```typescript
 * const localName = getDefaultImportName({ specifiers: [], type: "ImportDeclaration" } as never);
 * void localName;
 * ```
 */
function getDefaultImportName(
  statement: ESTree.ImportDeclaration,
): string | undefined {
  const defaultSpecifier = statement.specifiers.find(
    (specifier): specifier is ESTree.ImportDefaultSpecifier =>
      specifier.type === "ImportDefaultSpecifier",
  );
  return defaultSpecifier?.local.name;
}

/**
 * Filters top-level import declarations that include a `range`.
 * @param program Program node.
 * @returns Import declarations with stable ranges.
 * @example
 * ```typescript
 * const imports = getImportDeclarations({ body: [], sourceType: "module", type: "Program" } as never);
 * void imports;
 * ```
 */
function getImportDeclarations(
  program: ESTree.Program,
): RangedImportDeclaration[] {
  return program.body.filter(
    (statement): statement is RangedImportDeclaration =>
      statement.type === "ImportDeclaration" && hasRange(statement),
  );
}

/**
 * Returns all named imports from a declaration.
 * @param statement Import declaration.
 * @returns Named import identifiers.
 * @example
 * ```typescript
 * const named = getNamedImports({ specifiers: [], type: "ImportDeclaration" } as never);
 * void named;
 * ```
 */
function getNamedImports(statement: ESTree.ImportDeclaration): string[] {
  return statement.specifiers.flatMap((specifier) => {
    const importedName = toImportedName(specifier);
    return importedName === void 0 ? [] : [importedName];
  });
}

/**
 * Checks whether an import includes a namespace specifier.
 * @param statement Import declaration.
 * @returns True when declaration includes `* as x` form.
 * @example
 * ```typescript
 * const hasNamespace = hasNamespaceImport({ specifiers: [], type: "ImportDeclaration" } as never);
 * void hasNamespace;
 * ```
 */
function hasNamespaceImport(statement: ESTree.ImportDeclaration): boolean {
  return statement.specifiers.some(
    (specifier) => specifier.type === "ImportNamespaceSpecifier",
  );
}

/**
 * Checks whether an import declaration matches the mocked module.
 * @param statement Import declaration candidate.
 * @param moduleSpecifier Expected module path.
 * @returns True when declaration targets the same module.
 * @example
 * ```typescript
 * const matched = isMatchingImport({ source: { type: "Literal", value: "./x" }, type: "ImportDeclaration" } as never, "./x");
 * void matched;
 * ```
 */
function isMatchingImport(
  statement: ESTree.ImportDeclaration,
  moduleSpecifier: string,
): boolean {
  const sourceValue = statement.source.value;
  return typeof sourceValue === "string" && sourceValue === moduleSpecifier;
}

/**
 * Resolves whether imports should be updated in place or inserted.
 * @param program Program node to inspect.
 * @param moduleSpecifier Target module path.
 * @param names Import names that must exist.
 * @returns Insert or update plan for the import section.
 * @example
 * ```typescript
 * const plan = resolveImportPlan({ body: [], sourceType: "module", type: "Program" } as never, "./x", ["a"]);
 * void plan;
 * ```
 */
function resolveImportPlan(
  program: ESTree.Program,
  moduleSpecifier: string,
  names: string[],
): ImportPlan {
  const imports = getImportDeclarations(program);
  const existingImport = imports.find((statement) =>
    isMatchingImport(statement, moduleSpecifier),
  );

  return existingImport === void 0
    ? createInsertPlan(moduleSpecifier, names, imports.at(-1)?.range)
    : createUpdatePlan(existingImport, moduleSpecifier, names);
}

/**
 * Extracts imported identifier name from one specifier.
 * @param specifier Import clause entry.
 * @returns Imported identifier name.
 * @example
 * ```typescript
 * const imported = toImportedName({ type: "ImportSpecifier", imported: { type: "Identifier", name: "x" } } as never);
 * void imported;
 * ```
 */
function toImportedName(
  specifier: ESTree.ImportDeclaration["specifiers"][number],
): string | undefined {
  return specifier.type === "ImportSpecifier" &&
    specifier.imported.type === "Identifier"
    ? specifier.imported.name
    : void 0;
}

export { resolveImportPlan };
