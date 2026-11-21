import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import { createLiteral } from "../consistent-barrel-files/__tests__/test-helpers";
import { noDirectoryOnlyImportsRule } from "./no-directory-only-imports-rule";

/**
 * Runs one rule listener against a synthetic syntax node.
 * @param listenerName Name of the rule listener to invoke.
 * @param node Syntax node passed to the listener.
 * @returns Reports emitted by the listener.
 * @example
 * ```typescript
 * runListener("ImportDeclaration", node);
 * ```
 */
const runListener = (
  listenerName: string,
  node: Rule.Node,
): Rule.ReportDescriptor[] => {
  const reports: Rule.ReportDescriptor[] = [];
  const context = {
    report: (report: Rule.ReportDescriptor): void => {
      reports.push(report);
    },
  } as unknown as Rule.RuleContext;
  const listeners = noDirectoryOnlyImportsRule.create(context);
  const listener = (listeners as Record<string, unknown>)[listenerName] as
    ((listenerNode: Rule.Node) => void) | undefined;

  listener?.(node);

  return reports;
};

/**
 * Creates a no-substitution template literal for a dynamic import source.
 * @param value Literal text inside the template.
 * @returns A template literal with no expressions.
 * @example
 * ```typescript
 * createTemplateLiteral(".");
 * ```
 */
const createTemplateLiteral = (value: string): ESTree.TemplateLiteral => ({
  expressions: [],
  quasis: [
    {
      tail: true,
      type: "TemplateElement",
      value: { cooked: value, raw: value },
    },
  ],
  type: "TemplateLiteral",
});

/**
 * Creates a source-bearing node for the selected import or export listener.
 * @param type Import or export node type to create.
 * @param sourceSpecifier Module specifier used by the node.
 * @returns A source-bearing syntax node.
 * @example
 * ```typescript
 * createSourceNode("ImportDeclaration", "./feature");
 * ```
 */
const createSourceNode = (
  type: "ExportAllDeclaration" | "ExportNamedDeclaration" | "ImportDeclaration",
  sourceSpecifier: string,
): Rule.Node =>
  ({ source: createLiteral(sourceSpecifier), type }) as unknown as Rule.Node;

describe("no-directory-only-imports rule", () => {
  it.each([".", "..", "./..", ".././..", "./"])(
    "reports directory-only static imports: %s",
    (sourceSpecifier) => {
      // Act
      const actualReports = runListener(
        "ImportDeclaration",
        createSourceNode("ImportDeclaration", sourceSpecifier),
      );

      // Assert
      expect(actualReports).toHaveLength(1);
      expect(actualReports).toMatchObject([
        { messageId: "directoryOnlySpecifier" },
      ]);
    },
  );

  it.each(["../?raw", "./..#fragment", "..?raw#fragment"])(
    "reports directory-only paths with suffixes: %s",
    (sourceSpecifier) => {
      // Act
      const actualReports = runListener(
        "ImportDeclaration",
        createSourceNode("ImportDeclaration", sourceSpecifier),
      );

      // Assert
      expect(actualReports).toHaveLength(1);
    },
  );

  it.each([".\\..", "..\\.", ".\\"])(
    "treats backslashes as path separators: %s",
    (sourceSpecifier) => {
      // Act
      const actualReports = runListener(
        "ImportDeclaration",
        createSourceNode("ImportDeclaration", sourceSpecifier),
      );

      // Assert
      expect(actualReports).toHaveLength(1);
    },
  );

  it.each([
    "./value",
    "../domain/value",
    "./.../value",
    "./..foo",
    ".hidden",
    "@scope/package",
    "/absolute/path",
  ])("does not report named module paths: %s", (sourceSpecifier) => {
    // Act
    const actualReports = runListener(
      "ImportDeclaration",
      createSourceNode("ImportDeclaration", sourceSpecifier),
    );

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it.each(["ExportAllDeclaration", "ExportNamedDeclaration"] as const)(
    "reports directory-only %s sources",
    (listenerName) => {
      // Act
      const actualReports = runListener(
        listenerName,
        createSourceNode(listenerName, "../."),
      );

      // Assert
      expect(actualReports).toHaveLength(1);
    },
  );

  it("reports literal dynamic imports and no-substitution templates", () => {
    // Arrange
    const literalImport = {
      source: createLiteral("../.."),
      type: "ImportExpression",
    } as unknown as Rule.Node;
    const templateImport = {
      source: createTemplateLiteral("."),
      type: "ImportExpression",
    } as unknown as Rule.Node;

    // Act
    const [actualLiteralReports, actualTemplateReports] = [
      runListener("ImportExpression", literalImport),
      runListener("ImportExpression", templateImport),
    ];

    // Assert
    expect(actualLiteralReports).toHaveLength(1);
    expect(actualTemplateReports).toHaveLength(1);
  });

  it("ignores computed dynamic imports", () => {
    // Arrange
    const computedTemplate = {
      source: {
        expressions: [{ name: "path", type: "Identifier" }],
        quasis: [
          {
            tail: false,
            type: "TemplateElement",
            value: { cooked: ".", raw: "." },
          },
          {
            tail: true,
            type: "TemplateElement",
            value: { cooked: "", raw: "" },
          },
        ],
        type: "TemplateLiteral",
      },
      type: "ImportExpression",
    } as unknown as Rule.Node;

    // Act
    const actualReports = runListener("ImportExpression", computedTemplate);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("reports directory-only TypeScript import types", () => {
    // Arrange
    const importType = {
      source: createLiteral("."),
      type: "TSImportType",
    } as unknown as Rule.Node;

    // Act
    const actualReports = runListener("TSImportType", importType);

    // Assert
    expect(actualReports).toHaveLength(1);
  });

  it("ignores non-string module source literals", () => {
    // Arrange
    const importDeclaration = {
      source: { raw: "42", type: "Literal", value: 42 },
      type: "ImportDeclaration",
    } as unknown as Rule.Node;

    // Act
    const actualReports = runListener("ImportDeclaration", importDeclaration);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });
});
