import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { SourceCode } from "eslint";
import { describe, expect, it } from "vitest";

import {
  createBody,
  createExportWithoutSource,
  createImportDeclaration,
  createImportSpecifier,
  createProgram,
} from "../../../shared/test-utils/consistent-barrel-files/test-helpers";
import { noImportExportAliasesRule } from "./no-import-export-aliases-rule";

/** Message-id view over ESLint report descriptors used in tests. */
interface ReportDescriptorWithMessageId {
  /** Optional message id passed to context.report. */
  messageId?: string;
}

/** Type definition for captured rule reports. */
interface RuleReport {
  /** Message id emitted by the rule. */
  messageId: string | undefined;
}

/**
 * Creates a source-code object for the supplied body.
 * @param body Program body statements.
 * @returns SourceCode instance backed by an ESTree program.
 * @example
 * ```typescript
 * const sourceCode = createSourceCode(createBody());
 * ```
 */
const createSourceCode = (body: ESTree.Program["body"]): SourceCode =>
  new SourceCode("", createProgram(body));

/**
 * Runs the alias rule against an in-memory program body.
 * @param body Program body statements.
 * @returns Captured reports.
 * @example
 * ```typescript
 * const reports = runRule(createBody());
 * ```
 */
const runRule = (body: ESTree.Program["body"]): RuleReport[] => {
  const reports: RuleReport[] = [];
  const sourceCode = createSourceCode(body);

  const context = {
    cwd: "/repo",
    filename: "/repo/src/feature.ts",
    id: "no-import-export-aliases",
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    options: [],
    parserOptions: {},
    parserPath: void 0,
    physicalFilename: "/repo/src/feature.ts",
    report: (report: Rule.ReportDescriptor): void => {
      const { messageId } = report as ReportDescriptorWithMessageId;
      reports.push({ messageId });
    },
    settings: {},
    sourceCode,
  } as unknown as Rule.RuleContext;

  const listeners = noImportExportAliasesRule.create(context);
  const programListener = listeners.Program;

  programListener?.(context.sourceCode.ast);

  return reports;
};

/**
 * Builds an ExportSpecifier node.
 * @param localName Local symbol name.
 * @param exportedName Exported symbol name.
 * @returns ExportSpecifier node.
 * @example
 * ```typescript
 * const specifier = createExportSpecifier("A", "B");
 * ```
 */
const createExportSpecifier = (
  localName: string,
  exportedName = localName,
): ESTree.ExportSpecifier => ({
  exported: { name: exportedName, type: "Identifier" },
  local: { name: localName, type: "Identifier" },
  type: "ExportSpecifier",
});

describe("no-import-export-aliases rule", () => {
  it("reports aliased named imports without collisions", () => {
    // Arrange
    const body = createBody(
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("aliasNotAllowed");
  });

  it("allows aliased named imports when the original name is already imported", () => {
    // Arrange
    const body = createBody(
      createImportDeclaration([createImportSpecifier("A")]),
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("reports aliased named exports without collisions", () => {
    // Arrange
    const body = createBody(
      createExportWithoutSource([createExportSpecifier("A", "B")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("aliasNotAllowed");
  });

  it("allows aliased named exports when the original name is already imported", () => {
    // Arrange
    const body = createBody(
      createImportDeclaration([createImportSpecifier("A")]),
      createExportWithoutSource([createExportSpecifier("A", "B")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("reports aliasing from export-from declarations when no collision exists", () => {
    // Arrange
    const body = createBody({
      attributes: [],
      source: { raw: "'./dependency'", type: "Literal", value: "./dependency" },
      specifiers: [createExportSpecifier("A", "B")],
      type: "ExportNamedDeclaration",
    });

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("aliasNotAllowed");
  });

  it("does not report non-aliased named imports and exports", () => {
    // Arrange
    const body = createBody(
      createImportDeclaration([createImportSpecifier("A")]),
      createExportWithoutSource([createExportSpecifier("A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("does not report default or namespace imports", () => {
    // Arrange
    const body = createBody(
      createImportDeclaration([
        {
          local: { name: "Feature", type: "Identifier" },
          type: "ImportDefaultSpecifier",
        },
        {
          local: { name: "featureNamespace", type: "Identifier" },
          type: "ImportNamespaceSpecifier",
        },
      ]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("allows aliased imports when the original name is already declared in a variable", () => {
    // Arrange
    const variableDeclaration = {
      declarations: [
        {
          id: { name: "A", type: "Identifier" },
          init: { raw: "1", type: "Literal", value: 1 },
          type: "VariableDeclarator",
        },
      ],
      kind: "const",
      type: "VariableDeclaration",
    } as unknown as ESTree.VariableDeclaration;

    const body = createBody(
      variableDeclaration,
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("allows aliased imports when the original name is declared by a function", () => {
    // Arrange
    const body = createBody(
      {
        body: [],
        expression: false,
        generator: false,
        id: { name: "A", type: "Identifier" },
        params: [],
        type: "FunctionDeclaration",
      } as unknown as ESTree.FunctionDeclaration,
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("allows aliased imports when the original name is declared by a class", () => {
    // Arrange
    const body = createBody(
      {
        body: { body: [], type: "ClassBody" },
        id: { name: "A", type: "Identifier" },
        superClass: void 0,
        type: "ClassDeclaration",
      } as unknown as ESTree.ClassDeclaration,
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("reports aliased imports when only a type-only import binds the original name", () => {
    // Arrange
    const typeOnlyImport = {
      ...createImportDeclaration([createImportSpecifier("A")]),
      importKind: "type",
    } as unknown as ESTree.ImportDeclaration;

    const body = createBody(
      typeOnlyImport,
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("aliasNotAllowed");
  });

  it("allows aliased imports when the original name is bound in an object pattern", () => {
    // Arrange
    const variableDeclaration = {
      declarations: [
        {
          id: {
            properties: [
              {
                computed: false,
                key: { name: "source", type: "Identifier" },
                kind: "init",
                method: false,
                shorthand: false,
                type: "Property",
                value: { name: "A", type: "Identifier" },
              },
            ],
            type: "ObjectPattern",
          },
          init: { name: "source", type: "Identifier" },
          type: "VariableDeclarator",
        },
      ],
      kind: "const",
      type: "VariableDeclaration",
    } as unknown as ESTree.VariableDeclaration;

    const body = createBody(
      variableDeclaration,
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("allows aliased exports when the original name is already declared by an exported variable", () => {
    // Arrange
    const body = createBody(
      {
        declaration: {
          declarations: [
            {
              id: { name: "A", type: "Identifier" },
              init: { raw: "1", type: "Literal", value: 1 },
              type: "VariableDeclarator",
            },
          ],
          kind: "const",
          type: "VariableDeclaration",
        },
        specifiers: [],
        type: "ExportNamedDeclaration",
      } as unknown as ESTree.ExportNamedDeclaration,
      createExportWithoutSource([createExportSpecifier("A", "B")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("still reports aliases when variable declarations use non-Identifier patterns", () => {
    // Arrange
    const variableDeclaration = {
      declarations: [
        {
          id: {
            properties: [],
            type: "ObjectPattern",
          },
          init: { raw: "source", type: "Identifier" },
          type: "VariableDeclarator",
        },
      ],
      kind: "const",
      type: "VariableDeclaration",
    } as unknown as ESTree.VariableDeclaration;

    const body = createBody(
      variableDeclaration,
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("aliasNotAllowed");
  });

  it("reports aliases when declarations use malformed pattern types", () => {
    // Arrange
    const malformedPatternDeclaration = {
      declarations: [
        {
          id: {
            type: "Literal",
            value: "A",
          },
          init: { name: "values", type: "Identifier" },
          type: "VariableDeclarator",
        },
      ],
      kind: "const",
      type: "VariableDeclaration",
    } as unknown as ESTree.VariableDeclaration;
    const body = createBody(
      malformedPatternDeclaration,
      createImportDeclaration([createImportSpecifier("RenamedA", "A")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([{ messageId: "aliasNotAllowed" }]);
  });

  it("allows aliases when original names are bound via assignment, rest, and array patterns", () => {
    // Arrange
    const sparseElement = JSON.parse("null") as unknown as ESTree.Pattern;
    const complexDeclaration = {
      declarations: [
        {
          id: {
            elements: [
              {
                left: { name: "A", type: "Identifier" },
                right: { name: "fallback", type: "Identifier" },
                type: "AssignmentPattern",
              },
              {
                argument: { name: "B", type: "Identifier" },
                type: "RestElement",
              },
              sparseElement,
            ],
            type: "ArrayPattern",
          },
          init: { name: "values", type: "Identifier" },
          type: "VariableDeclarator",
        },
        {
          id: {
            properties: [
              {
                argument: { name: "C", type: "Identifier" },
                type: "RestElement",
              },
            ],
            type: "ObjectPattern",
          },
          init: { name: "source", type: "Identifier" },
          type: "VariableDeclarator",
        },
      ],
      kind: "const",
      type: "VariableDeclaration",
    } as unknown as ESTree.VariableDeclaration;
    const body = createBody(
      complexDeclaration,
      createImportDeclaration([createImportSpecifier("RenamedA", "A")]),
      createImportDeclaration([createImportSpecifier("RenamedB", "B")]),
      createImportDeclaration([createImportSpecifier("RenamedC", "C")]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("tracks named export declarations and ignores anonymous default declarations", () => {
    // Arrange
    const body = createBody(
      {
        declaration: {
          body: [],
          expression: false,
          generator: false,
          id: { name: "A", type: "Identifier" },
          params: [],
          type: "FunctionDeclaration",
        },
        specifiers: [],
        type: "ExportNamedDeclaration",
      } as unknown as ESTree.ExportNamedDeclaration,
      {
        declaration: {
          body: { body: [], type: "ClassBody" },
          id: { name: "B", type: "Identifier" },
          superClass: void 0,
          type: "ClassDeclaration",
        },
        specifiers: [],
        type: "ExportNamedDeclaration",
      } as unknown as ESTree.ExportNamedDeclaration,
      {
        declaration: {
          body: [],
          expression: false,
          generator: false,
          id: { name: "C", type: "Identifier" },
          params: [],
          type: "FunctionDeclaration",
        },
        type: "ExportDefaultDeclaration",
      } as unknown as ESTree.ExportDefaultDeclaration,
      {
        declaration: {
          body: { body: [], type: "ClassBody" },
          id: { name: "D", type: "Identifier" },
          superClass: void 0,
          type: "ClassDeclaration",
        },
        type: "ExportDefaultDeclaration",
      } as unknown as ESTree.ExportDefaultDeclaration,
      {
        declaration: {
          body: [],
          expression: false,
          generator: false,
          id: void 0,
          params: [],
          type: "FunctionDeclaration",
        },
        type: "ExportDefaultDeclaration",
      } as unknown as ESTree.ExportDefaultDeclaration,
      createImportDeclaration([createImportSpecifier("RenamedA", "A")]),
      createImportDeclaration([createImportSpecifier("RenamedB", "B")]),
      createImportDeclaration([createImportSpecifier("RenamedC", "C")]),
      createImportDeclaration([createImportSpecifier("RenamedD", "D")]),
      createImportDeclaration([
        createImportSpecifier("RenamedMissing", "Missing"),
      ]),
    );

    // Act
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([{ messageId: "aliasNotAllowed" }]);
  });
});
