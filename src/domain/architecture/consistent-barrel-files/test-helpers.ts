import type { AST } from "eslint";
import type * as ESTree from "estree";

import { mkdirSync, mkdtempSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";

/**
 * Creates a temporary repo directory for test fixtures.
 * @param root Root folder to create the temporary directory under.
 * @returns The generated temporary directory path.
 * @example
 * ```typescript
 * const directory = createRepoDirectory("tmp");
 * ```
 */
const createRepoDirectory = (root: "src" | "tmp"): string => {
  const baseDirectory = path.join(cwd(), root);
  mkdirSync(baseDirectory, { recursive: true });
  return mkdtempSync(path.join(baseDirectory, "barrel-files-"));
};

/**
 * Wraps statements in a program node for SourceCode construction.
 * @param body Program body statements.
 * @returns The AST program wrapper.
 * @example
 * ```typescript
 * const program = createProgram([]);
 * ```
 */
const createProgram = (body: ESTree.Program["body"]): AST.Program => ({
  body,
  comments: [],
  loc: { end: { column: 0, line: 1 }, start: { column: 0, line: 1 } },
  range: [0, 0],
  sourceType: "module",
  tokens: [],
  type: "Program",
});

/**
 * Creates a string literal node for import and export statements.
 * @param value Literal value to wrap.
 * @returns The ESTree literal node.
 * @example
 * ```typescript
 * const literal = createLiteral("./feature");
 * ```
 */
const createLiteral = (value: string): ESTree.Literal =>
  ({ raw: `'${value}'`, type: "Literal", value }) satisfies ESTree.Literal;

/**
 * Converts a raw symbol name into the ESTree shape used by the fixture factories.
 * @param name Raw symbol text to encode in the AST node.
 * @returns An ESTree Identifier carrying the supplied symbol text.
 * @example
 * ```typescript
 * const identifier = createIdentifier("feature");
 * ```
 */
const createIdentifier = (name: string): ESTree.Identifier =>
  ({ name, type: "Identifier" }) satisfies ESTree.Identifier;

/**
 * Creates an export specifier node.
 * @param localName Local identifier name.
 * @param exportedName Exported identifier name.
 * @returns The ESTree export specifier.
 * @example
 * ```typescript
 * const specifier = createExportSpecifier("feature");
 * ```
 */
const createExportSpecifier = (
  localName: string,
  exportedName = localName,
): ESTree.ExportSpecifier =>
  ({
    exported: createIdentifier(exportedName),
    local: createIdentifier(localName),
    type: "ExportSpecifier",
  }) satisfies ESTree.ExportSpecifier;

/**
 * Creates an import specifier node.
 * @param localName Local identifier name.
 * @param importedName Imported identifier name.
 * @returns The ESTree import specifier.
 * @example
 * ```typescript
 * const specifier = createImportSpecifier("feature");
 * ```
 */
const createImportSpecifier = (
  localName: string,
  importedName = localName,
): ESTree.ImportSpecifier =>
  ({
    imported: createIdentifier(importedName),
    local: createIdentifier(localName),
    type: "ImportSpecifier",
  }) satisfies ESTree.ImportSpecifier;

/**
 * Creates an import default specifier node.
 * @param localName Local identifier name.
 * @returns The ESTree default import specifier.
 * @example
 * ```typescript
 * const specifier = createImportDefaultSpecifier("feature");
 * ```
 */
const createImportDefaultSpecifier = (
  localName: string,
): ESTree.ImportDefaultSpecifier =>
  ({
    local: createIdentifier(localName),
    type: "ImportDefaultSpecifier",
  }) satisfies ESTree.ImportDefaultSpecifier;

/**
 * Creates an import declaration for fixture programs.
 * @param specifiers Import specifiers to include.
 * @returns The ESTree import declaration.
 * @example
 * ```typescript
 * const declaration = createImportDeclaration();
 * ```
 */
const createImportDeclaration = (
  specifiers: ESTree.ImportDeclaration["specifiers"] = [],
): ESTree.ImportDeclaration =>
  ({
    attributes: [],
    source: createLiteral("./feature"),
    specifiers,
    type: "ImportDeclaration",
  }) satisfies ESTree.ImportDeclaration;

/**
 * Creates an export-all declaration for fixture programs.
 * @returns The ESTree export-all declaration.
 * @example
 * ```typescript
 * const declaration = createExportAll();
 * ```
 */
const createExportAll = (): ESTree.ExportAllDeclaration =>
  ({
    attributes: [],
    exported: createIdentifier("all"),
    source: createLiteral("./feature"),
    type: "ExportAllDeclaration",
  }) satisfies ESTree.ExportAllDeclaration;

/**
 * Creates an export-from declaration for fixture programs.
 * @returns The ESTree named export declaration.
 * @example
 * ```typescript
 * const declaration = createExportNamedFrom();
 * ```
 */
const createExportNamedFrom = (): ESTree.ExportNamedDeclaration =>
  ({
    attributes: [],
    source: createLiteral("./feature"),
    specifiers: [],
    type: "ExportNamedDeclaration",
  }) satisfies ESTree.ExportNamedDeclaration;

/**
 * Creates an export declaration with an inline variable declaration.
 * @returns The ESTree named export declaration.
 * @example
 * ```typescript
 * const declaration = createExportWithDeclaration();
 * ```
 */
const createExportWithDeclaration = (): ESTree.ExportNamedDeclaration => {
  const declaration = {
    declarations: [],
    kind: "const",
    type: "VariableDeclaration",
  } satisfies ESTree.VariableDeclaration;

  return {
    attributes: [],
    declaration,
    specifiers: [],
    type: "ExportNamedDeclaration",
  } satisfies ESTree.ExportNamedDeclaration;
};

/**
 * Creates an exported interface declaration for tests.
 * @returns The exported interface declaration node.
 * @example
 * ```typescript
 * const declaration = createExportInterfaceDeclaration();
 * ```
 */
const createExportInterfaceDeclaration = (): ESTree.Program["body"][number] =>
  ({
    declaration: {
      body: { body: [], type: "TSInterfaceBody" },
      id: createIdentifier("Feature"),
      type: "TSInterfaceDeclaration",
    },
    specifiers: [],
    type: "ExportNamedDeclaration",
  }) as unknown as ESTree.Program["body"][number];

/**
 * Creates an exported type alias declaration for tests.
 * @returns The exported type alias declaration node.
 * @example
 * ```typescript
 * const declaration = createExportTypeAliasDeclaration();
 * ```
 */
const createExportTypeAliasDeclaration = (): ESTree.Program["body"][number] =>
  ({
    declaration: {
      id: createIdentifier("Feature"),
      type: "TSTypeAliasDeclaration",
      typeAnnotation: { type: "TSStringKeyword" },
    },
    specifiers: [],
    type: "ExportNamedDeclaration",
  }) as unknown as ESTree.Program["body"][number];

/**
 * Creates a named export without a source value.
 * @param specifiers Export specifiers to include.
 * @returns The ESTree named export declaration.
 * @example
 * ```typescript
 * const declaration = createExportWithoutSource();
 * ```
 */
const createExportWithoutSource = (
  specifiers: ESTree.ExportSpecifier[] = [],
): ESTree.ExportNamedDeclaration =>
  ({
    attributes: [],
    specifiers,
    type: "ExportNamedDeclaration",
  }) satisfies ESTree.ExportNamedDeclaration;

/**
 * Creates a default export declaration for an identifier.
 * @param name Identifier to export.
 * @returns The ESTree default export declaration.
 * @example
 * ```typescript
 * const declaration = createExportDefaultIdentifier("feature");
 * ```
 */
const createExportDefaultIdentifier = (
  name: string,
): ESTree.ExportDefaultDeclaration =>
  ({
    declaration: createIdentifier(name),
    type: "ExportDefaultDeclaration",
  }) satisfies ESTree.ExportDefaultDeclaration;

/**
 * Collects statements into a program body.
 * @param statements Statements to include in the body.
 * @returns The program body array.
 * @example
 * ```typescript
 * const body = createBody();
 * ```
 */
const createBody = (
  ...statements: ESTree.Program["body"][number][]
): ESTree.Program["body"] => statements;

export {
  createBody,
  createExportAll,
  createExportDefaultIdentifier,
  createExportInterfaceDeclaration,
  createExportNamedFrom,
  createExportSpecifier,
  createExportTypeAliasDeclaration,
  createExportWithDeclaration,
  createExportWithoutSource,
  createImportDeclaration,
  createImportDefaultSpecifier,
  createImportSpecifier,
  createProgram,
  createRepoDirectory,
};
