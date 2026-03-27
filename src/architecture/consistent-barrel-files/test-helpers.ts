import type { AST } from "eslint";
import type * as ESTree from "estree";

import fs from "node:fs";
import path from "node:path";

/**
 * Creates a temporary repo directory under the given root.
 * @param root Root folder for temp files.
 * @returns The generated directory path.
 * @example
 * ```typescript
 * const directory = createRepoDirectory("tmp");
 * ```
 */
const createRepoDirectory = (root: "src" | "tmp"): string => {
  const baseDirectory = path.join(process.cwd(), root);
  fs.mkdirSync(baseDirectory, { recursive: true });
  return fs.mkdtempSync(path.join(baseDirectory, "barrel-files-"));
};

/**
 * Creates a program wrapper around the supplied AST body.
 * @param body Program body statements.
 * @returns The AST program.
 * @example
 * ```typescript
 * const program = createProgram([]);
 * ```
 */
const createProgram = (body: ESTree.Program["body"]): AST.Program => ({
  body,
  comments: [],
  loc: {
    end: { column: 0, line: 1 },
    start: { column: 0, line: 1 },
  },
  range: [0, 0],
  sourceType: "module",
  tokens: [],
  type: "Program",
});

/**
 * Creates an ESTree literal node.
 * @param value Literal string to wrap.
 * @returns The literal node.
 * @example
 * ```typescript
 * const literal = createLiteral("./feature");
 * ```
 */
const createLiteral = (value: string): ESTree.Literal =>
  ({
    raw: `'${value}'`,
    type: "Literal",
    value,
  }) satisfies ESTree.Literal;

/**
 * Creates an ESTree identifier node.
 * @param name Identifier to create.
 * @returns The identifier node.
 * @example
 * ```typescript
 * const id = createIdentifier("all");
 * ```
 */
const createIdentifier = (name: string): ESTree.Identifier =>
  ({ name, type: "Identifier" }) satisfies ESTree.Identifier;

/**
 * Creates an ESTree export specifier.
 * @param localName Local identifier name.
 * @param exportedName Exported identifier name.
 * @returns Export specifier node.
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
 * Creates an ESTree import specifier.
 * @param localName Local identifier name.
 * @param importedName Imported identifier name.
 * @returns Import specifier node.
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
 * Creates an ESTree import default specifier.
 * @param localName Local identifier name.
 * @returns Import default specifier node.
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
 * Creates an import declaration for test fixtures.
 * @param specifiers Specifiers to include.
 * @returns Import declaration node for tests.
 * @example
 * ```typescript
 * const node = createImportDeclaration([createImportSpecifier("feature")]);
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
 * Creates an export-all declaration for test fixtures.
 * @returns The export-all declaration node.
 * @example
 * ```typescript
 * const node = createExportAll();
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
 * Creates a named export-from declaration for test fixtures.
 * @returns Export declaration node for tests.
 * @example
 * ```typescript
 * const node = createExportNamedFrom();
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
 * Creates a named export with a local declaration.
 * @returns Export declaration node for tests.
 * @example
 * ```typescript
 * const node = createExportWithDeclaration();
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
 * @example
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
 * @example
 */
const createExportTypeAliasDeclaration = (): ESTree.Program["body"][number] =>
  ({
    declaration: {
      id: createIdentifier("Feature"),
      type: "TSTypeAliasDeclaration",
      typeAnnotation: {
        type: "TSStringKeyword",
      },
    },
    specifiers: [],
    type: "ExportNamedDeclaration",
  }) as unknown as ESTree.Program["body"][number];

/**
 * Creates a named export without a source value.
 * @param specifiers Export specifiers to include.
 * @returns Export declaration node for tests.
 * @example
 * ```typescript
 * const node = createExportWithoutSource([createExportSpecifier("feature")]);
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
 * Creates a default export for an identifier.
 * @param name Identifier to export.
 * @returns Export default declaration node for tests.
 * @example
 * ```typescript
 * const node = createExportDefaultIdentifier("feature");
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
 * Collects statements into a program body array.
 * @param statements Statements to include in the program.
 * @returns The program body array.
 * @example
 * ```typescript
 * const body = createBody(createImportDeclaration());
 * ```
 */
const createBody = (
  ...statements: ESTree.Program["body"][number][]
): ESTree.Program["body"] => statements;

/**
 * Writes a barrel file to the given path.
 * @param filePath Path for the barrel file.
 * @example
 * ```typescript
 * writeBarrel("/tmp/index.ts");
 * ```
 */
const writeBarrel = (filePath: string): void => {
  fs.writeFileSync(filePath, "export * from './feature';", "utf8");
};

/**
 * Writes a feature file to the given path.
 * @param filePath Path for the feature file.
 * @example
 * ```typescript
 * writeFeature("/tmp/feature.ts");
 * ```
 */
const writeFeature = (filePath: string): void => {
  fs.writeFileSync(filePath, "export const feature = 1;", "utf8");
};

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
  writeBarrel,
  writeFeature,
};
