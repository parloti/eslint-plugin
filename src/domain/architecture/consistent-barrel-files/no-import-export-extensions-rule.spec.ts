import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { SourceCode } from "eslint";
import { describe, expect, it } from "vitest";

import { noImportExportExtensionsRule } from "./no-import-export-extensions-rule";
import {
  createBody,
  createImportDeclaration,
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
 * Runs the extension rule against an in-memory program body.
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
    id: "no-import-export-extensions",
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

  const listeners = noImportExportExtensionsRule.create(context);
  const programListener = listeners.Program;

  programListener?.(context.sourceCode.ast);

  return reports;
};

/**
 * Creates a source literal node.
 * @param value Literal string value.
 * @returns ESTree literal for module source.
 * @example
 * ```typescript
 * const source = createLiteral("./feature.ts");
 * ```
 */
const createLiteral = (value: string): ESTree.Literal => ({
  raw: `'${value}'`,
  type: "Literal",
  value,
});

describe("no-import-export-extensions rule", () => {
  it.each([
    "./feature.ts",
    "./feature.tsx",
    "./feature.js",
    "./feature.jsx",
    "./feature.mts",
    "./feature.cts",
    "./feature.mjs",
    "./feature.cjs",
    "@scope/package/index.js",
  ])("reports imports with %s", (source) => {
    // Arrange
    const body = createBody({
      ...createImportDeclaration(),
      source: createLiteral(source),
    });

    // Act
    const reports = runRule(body);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("unexpectedExtension");
  });

  it("reports export-all declarations with extension suffixes", () => {
    // Arrange
    const body = createBody({
      attributes: [],
      exported: { name: "feature", type: "Identifier" },
      source: createLiteral("./feature.ts"),
      type: "ExportAllDeclaration",
    });

    // Act
    const reports = runRule(body);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("unexpectedExtension");
  });

  it("reports named export-from declarations with extension suffixes", () => {
    // Arrange
    const body = createBody({
      attributes: [],
      source: createLiteral("./feature.ts"),
      specifiers: [],
      type: "ExportNamedDeclaration",
    });

    // Act
    const reports = runRule(body);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("unexpectedExtension");
  });

  it.each(["./feature.ts?raw", "./feature.ts#fragment"])(
    "reports source specifiers with extensions before suffix markers: %s",
    (source) => {
      // Arrange
      const body = createBody({
        ...createImportDeclaration(),
        source: createLiteral(source),
      });

      // Act
      const reports = runRule(body);

      // Assert
      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe("unexpectedExtension");
    },
  );

  it.each(["./feature", "node:fs", "@scope/package", "@scope/package/index"])(
    "does not report sources without disallowed suffixes: %s",
    (source) => {
      // Arrange
      const body = createBody({
        ...createImportDeclaration(),
        source: createLiteral(source),
      });

      // Act
      const reports = runRule(body);

      // Assert
      expect(reports).toStrictEqual([]);
    },
  );

  it("does not report named exports without source literals", () => {
    // Arrange
    const body = createBody({
      attributes: [],
      specifiers: [],
      type: "ExportNamedDeclaration",
    });

    // Act
    const reports = runRule(body);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("does not report import declarations with non-string source literals", () => {
    // Arrange
    const body = createBody({
      ...createImportDeclaration(),
      source: { raw: "123", type: "Literal", value: 123 } as ESTree.Literal,
    });

    // Act
    const reports = runRule(body);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("ignores unsupported program statements", () => {
    // Arrange
    const body = createBody({
      declarations: [
        {
          id: { name: "value", type: "Identifier" },
          init: { raw: "1", type: "Literal", value: 1 },
          type: "VariableDeclarator",
        },
      ],
      kind: "const",
      type: "VariableDeclaration",
    } as unknown as ESTree.VariableDeclaration);

    // Act
    const reports = runRule(body);

    // Assert
    expect(reports).toStrictEqual([]);
  });
});
