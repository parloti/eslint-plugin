import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import { createBody } from "../consistent-barrel-files/__tests__/test-helpers";
import {
  captureFix,
  captureSuggestionFix,
  runExportAllRule,
  runImportRule,
  runNamedExportRule,
  runRule,
} from "./__tests__/test-helpers";
import { noImportExportExtensionsRule } from "./no-import-export-extensions-rule";

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
    // Act
    const actualReports = runImportRule(source);

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("unexpectedExtension");
  });

  it("reports export-all declarations with extension suffixes", () => {
    // Act
    const actualReports = runExportAllRule("./feature.ts");

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("unexpectedExtension");
  });

  it("reports named export-from declarations with extension suffixes", () => {
    // Act
    const actualReports = runNamedExportRule("./feature.ts");

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.messageId).toBe("unexpectedExtension");
  });

  it.each(["./feature.ts?raw", "./feature.ts#fragment"])(
    "reports source specifiers with extensions before suffix markers: %s",
    (source) => {
      // Act
      const actualReports = runImportRule(source);

      // Assert
      expect(actualReports).toHaveLength(1);
      expect(actualReports[0]?.messageId).toBe("unexpectedExtension");
    },
  );

  it("reports a source containing both query and hash suffixes", () => {
    // Act
    const actualReports = runImportRule("./feature.ts?raw#fragment");

    // Assert
    expect(actualReports).toHaveLength(1);
  });

  it.each(["./feature", "node:fs", "@scope/package", "@scope/package/index"])(
    "does not report sources without disallowed suffixes: %s",
    (source) => {
      // Act
      const actualReports = runImportRule(source);

      // Assert
      expect(actualReports).toStrictEqual([]);
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
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("does not report import declarations with non-string source literals", () => {
    // Act
    const actualReports = runImportRule({
      raw: "123",
      type: "Literal",
      value: 123,
    });

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("reports an extension when the literal has no raw source for a fix", () => {
    // Act
    const actualReports = runImportRule({
      type: "Literal",
      value: "./feature.ts",
    });

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.fix).toBeUndefined();
    expect(actualReports[0]?.suggest).toBeUndefined();
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
    const actualReports = runRule(body);

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it.each([
    { expected: "'./feature'", source: "./feature.ts" },
    { expected: "'./feature'", source: "./feature.tsx" },
    { expected: "'./feature'", source: "./feature.js" },
    { expected: "'./feature'", source: "./feature.jsx" },
    { expected: "'./feature'", source: "./feature.mts" },
    { expected: "'./feature'", source: "./feature.cts" },
    { expected: "'./feature'", source: "./feature.mjs" },
    { expected: "'./feature'", source: "./feature.cjs" },
    { expected: "'@scope/package/index'", source: "@scope/package/index.js" },
  ])("fix removes the extension from $source", ({ expected, source }) => {
    // Act
    const actualFixes = captureFix(runImportRule(source));

    // Assert
    expect(actualFixes).toStrictEqual([{ text: expected }]);
  });

  it.each([
    { expected: "'./feature?raw'", source: "./feature.ts?raw" },
    { expected: "'./feature#fragment'", source: "./feature.ts#fragment" },
  ])(
    "fix preserves suffix markers: $source → $expected",
    ({ expected, source }) => {
      // Act
      const actualFixes = captureFix(runImportRule(source));

      // Assert
      expect(actualFixes).toStrictEqual([{ text: expected }]);
    },
  );

  it("provides an editor suggestion with the removeExtension message", () => {
    // Act
    const actualReports = runImportRule("./feature.ts");

    // Assert
    expect(actualReports).toHaveLength(1);
    expect(actualReports[0]?.suggest).toHaveLength(1);
    expect(actualReports[0]?.suggest?.[0]?.messageId).toBe("removeExtension");
  });

  it("suggestion fix removes the extension", () => {
    // Act
    const actualFixes = captureSuggestionFix(runImportRule("./feature.ts"));

    // Assert
    expect(actualFixes).toStrictEqual([{ text: "'./feature'" }]);
  });

  it("marks the rule as fixable in metadata", () => {
    // Act
    const actualFixable = noImportExportExtensionsRule.meta?.fixable;

    // Assert
    expect(actualFixable).toBe("code");
  });

  it("marks the rule as having suggestions in metadata", () => {
    // Act
    const actualHasSuggestions =
      noImportExportExtensionsRule.meta?.hasSuggestions;

    // Assert
    expect(actualHasSuggestions).toBe(true);
  });
});
