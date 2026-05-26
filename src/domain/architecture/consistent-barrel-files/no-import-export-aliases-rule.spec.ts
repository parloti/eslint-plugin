import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { SourceCode } from "eslint";
import { describe, expect, it } from "vitest";

import { noImportExportAliasesRule } from "./no-import-export-aliases-rule";
import {
  createBody,
  createExportWithoutSource,
  createImportDeclaration,
  createImportSpecifier,
  createProgram,
} from "./test-helpers";

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
    const reports = runRule(body);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("aliasNotAllowed");
  });

  it("allows aliased named imports when the original name is already imported", () => {
    // Arrange
    const body = createBody(
      createImportDeclaration([createImportSpecifier("A")]),
      createImportDeclaration([createImportSpecifier("B", "A")]),
    );

    // Act
    const reports = runRule(body);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("reports aliased named exports without collisions", () => {
    // Arrange
    const body = createBody(
      createExportWithoutSource([createExportSpecifier("A", "B")]),
    );

    // Act
    const reports = runRule(body);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("aliasNotAllowed");
  });

  it("allows aliased named exports when the original name is already imported", () => {
    // Arrange
    const body = createBody(
      createImportDeclaration([createImportSpecifier("A")]),
      createExportWithoutSource([createExportSpecifier("A", "B")]),
    );

    // Act
    const reports = runRule(body);

    // Assert
    expect(reports).toStrictEqual([]);
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
    const reports = runRule(body);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("aliasNotAllowed");
  });

  it("does not report non-aliased named imports and exports", () => {
    // Arrange
    const body = createBody(
      createImportDeclaration([createImportSpecifier("A")]),
      createExportWithoutSource([createExportSpecifier("A")]),
    );

    // Act
    const reports = runRule(body);

    // Assert
    expect(reports).toStrictEqual([]);
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
    const reports = runRule(body);

    // Assert
    expect(reports).toStrictEqual([]);
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
    const reports = runRule(body);

    // Assert
    expect(reports).toStrictEqual([]);
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
    const reports = runRule(body);

    // Assert
    expect(reports).toStrictEqual([]);
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
    const reports = runRule(body);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("aliasNotAllowed");
  });
});
