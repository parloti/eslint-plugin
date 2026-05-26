import type { AST, Rule } from "eslint";

import { SourceCode } from "eslint";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { cwd } from "node:process";
import * as ts from "typescript";
import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import { getOptions } from "./no-unused-exports-options";
import {
  classifyExportUsage,
  collectCrossFileUsages,
  collectExportDeclarationNames,
  collectExportedElements,
  collectImportDeclarationNames,
  collectPatternIdentifierNames,
  doesUsageMatchExport,
  getTypeScriptProgram,
  resolveModuleSpecifier,
  wildcardExportName,
} from "./no-unused-exports-utilities";

/**
 * Parses one TypeScript module and returns its program node.
 * @param code Source text.
 * @returns Parsed program node.
 * @example
 * ```typescript
 * const program = parseProgram("export const value = 1;");
 * ```
 */
const parseProgram = (code: string): AST.Program =>
  parser.parseForESLint(code).ast as AST.Program;

/**
 * Builds a temporary project and collects cross-file usages for one source module.
 * @returns Collected usages for the temporary fixture source file.
 * @example
 * ```typescript
 * const usages = collectFixtureUsages();
 * ```
 */
const collectFixtureUsages = () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), "no-unused-exports-"));

  try {
    const sourceDirectory = path.join(temporaryRoot, "src");
    const testsDirectory = path.join(temporaryRoot, "tests");

    mkdirSync(sourceDirectory, { recursive: true });
    mkdirSync(testsDirectory, { recursive: true });

    const featureFile = path.join(sourceDirectory, "feature.ts");
    const consumerFile = path.join(sourceDirectory, "consumer.ts");
    const otherFile = path.join(sourceDirectory, "other.ts");
    const testConsumerFile = path.join(testsDirectory, "feature.spec.ts");

    writeFileSync(
      featureFile,
      "export const feature = 1;\nexport default feature;\n",
    );
    writeFileSync(otherFile, "export const unrelated = 1;\n");
    writeFileSync(
      consumerFile,
      [
        "import featureDefault, { feature } from './feature';",
        "import { unrelated } from './other';",
        "void featureDefault;",
        "void feature;",
        "void unrelated;",
        "export { unrelated as unrelatedExport } from './other';",
        "export { feature as reExported } from './feature';",
      ].join("\n"),
    );
    writeFileSync(
      testConsumerFile,
      "import { feature } from '../src/feature';\nvoid feature;\n",
    );

    const program = ts.createProgram(
      [featureFile, consumerFile, otherFile, testConsumerFile],
      {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ESNext,
      },
    );
    const state = getOptions([
      {
        testFilePatterns: ["tests/**/*.ts", "**/*.spec.ts"],
      },
    ]);

    return collectCrossFileUsages(program, featureFile, state, temporaryRoot);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

/**
 * Collects outputs that exercise fallback branches in utility helpers.
 * @returns Exported names, unresolved module result, and unsupported pattern names.
 * @example
 * ```typescript
 * const actual = collectFallbackBranchResult();
 * void actual;
 * ```
 */
const collectFallbackBranchResult = () => {
  const program = parseProgram(
    [
      "import { feature } from './feature';",
      "export { feature as renamed } from './feature';",
      "const localValue = 1;",
    ].join("\n"),
  );
  const statementWithLocalFallback = {
    source: {
      type: "Literal",
      value: "./feature",
    },
    specifiers: [
      {
        exported: {
          type: "Literal",
          value: "renamed",
        },
        local: {
          name: "feature",
          type: "Identifier",
        },
        type: "ExportSpecifier",
      },
    ],
    type: "ExportNamedDeclaration",
  } as unknown as AST.Program["body"][number];
  const unsupportedPattern = { type: "Literal", value: "x" };

  const unresolvedRoot = mkdtempSync(path.join(tmpdir(), "no-unused-resolve-"));

  try {
    const unresolvedFile = path.join(unresolvedRoot, "feature.ts");
    writeFileSync(unresolvedFile, "export const feature = 1;\n");

    const unresolvedProgram = ts.createProgram([unresolvedFile], {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ESNext,
    });

    return {
      exportedNames: collectExportedElements([
        ...program.body,
        statementWithLocalFallback,
      ]).map((element) => element.exportedName),
      unresolved: resolveModuleSpecifier(
        "./missing",
        unresolvedFile,
        unresolvedProgram,
      ),
      unsupportedPatternNames:
        collectPatternIdentifierNames(unsupportedPattern),
    };
  } finally {
    rmSync(unresolvedRoot, { force: true, recursive: true });
  }
};

describe("no-unused-exports utilities", () => {
  it("collects exported elements for mixed export styles", () => {
    // Arrange
    const program = parseProgram(
      [
        "export const value = 1;",
        "export type Alias = string;",
        "export interface Shape { readonly size: number; }",
        "export { value as renamed };",
        "export { helper } from './helper';",
        "export * from './feature';",
        "export default value;",
      ].join("\n"),
    );

    // Act
    const actualExportedNames = collectExportedElements(program.body).map(
      (element) => element.exportedName,
    );

    // Assert
    expect(actualExportedNames).toStrictEqual([
      "value",
      "Alias",
      "Shape",
      "renamed",
      "helper",
      wildcardExportName,
      "default",
    ]);
  });

  it("collects identifier names from nested patterns", () => {
    // Arrange
    const declaration = parseProgram(
      "export const { alpha, nested: { beta }, ...rest } = input;",
    ).body[0] as unknown;

    const declarationRecord = declaration as Record<string, unknown>;
    const declarationNode = declarationRecord["declaration"] as
      | Record<string, unknown>
      | undefined;
    const declarations = declarationNode?.["declarations"] as
      | undefined
      | unknown[];
    const firstDeclaration = declarations?.[0];
    const firstDeclarationRecord =
      firstDeclaration !== null && typeof firstDeclaration === "object"
        ? (firstDeclaration as Record<string, unknown>)
        : undefined;
    const pattern = firstDeclarationRecord?.["id"];

    // Act
    const actualNames = collectPatternIdentifierNames(pattern);

    // Assert
    expect(actualNames).toStrictEqual(["alpha", "beta", "rest"]);
  });

  it("collects identifier names from array patterns with assignments and rest elements", () => {
    // Arrange
    const declaration = parseProgram(
      "export const [primary = fallback, ...others] = values;",
    ).body[0] as unknown;

    const declarationRecord = declaration as Record<string, unknown>;
    const declarationNode = declarationRecord["declaration"] as
      | Record<string, unknown>
      | undefined;
    const declarations = declarationNode?.["declarations"] as
      | undefined
      | unknown[];
    const firstDeclaration = declarations?.[0];
    const firstDeclarationRecord =
      firstDeclaration !== null && typeof firstDeclaration === "object"
        ? (firstDeclaration as Record<string, unknown>)
        : undefined;
    const pattern = firstDeclarationRecord?.["id"];

    // Act
    const actualNames = collectPatternIdentifierNames(pattern);

    // Assert
    expect(actualNames).toStrictEqual(["primary", "others"]);
  });

  it("returns an empty list for undefined patterns", () => {
    // Act
    const actualNames = collectPatternIdentifierNames(void 0);

    // Assert
    expect(actualNames).toStrictEqual([]);
  });

  it("returns empty names for incomplete identifier, array, and object patterns", () => {
    // Arrange
    const incompleteIdentifierPattern = {
      type: "Identifier",
    };
    const incompleteArrayPattern = {
      type: "ArrayPattern",
    };
    const incompleteObjectPattern = {
      type: "ObjectPattern",
    };

    // Act
    const actual = {
      arrayPatternNames: collectPatternIdentifierNames(incompleteArrayPattern),
      identifierNames: collectPatternIdentifierNames(
        incompleteIdentifierPattern,
      ),
      objectPatternNames: collectPatternIdentifierNames(
        incompleteObjectPattern,
      ),
    };

    // Assert
    expect(actual).toStrictEqual({
      arrayPatternNames: [],
      identifierNames: [],
      objectPatternNames: [],
    });
  });

  it("matches usage names with wildcard support", () => {
    // Arrange
    const usageSamples = [
      doesUsageMatchExport("feature", "feature"),
      doesUsageMatchExport("feature", wildcardExportName),
      doesUsageMatchExport(wildcardExportName, "feature"),
      doesUsageMatchExport("feature", "other"),
    ];

    // Act
    const actualResult = usageSamples;

    // Assert
    expect(actualResult).toStrictEqual([true, true, true, false]);
  });

  it("classifies production, test-only, and unused exports", () => {
    // Arrange
    const productionUsage = [
      { importedName: "other", isTestFile: true },
      { importedName: "feature", isTestFile: false },
    ];
    const testOnlyUsage = [
      { importedName: "other", isTestFile: true },
      { importedName: "feature", isTestFile: true },
    ];

    // Act
    const actualResult = {
      production: classifyExportUsage("feature", productionUsage),
      testOnly: classifyExportUsage("feature", testOnlyUsage),
      unused: classifyExportUsage("feature", []),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      production: "production",
      testOnly: "test-only",
      unused: "unused",
    });
  });

  it("collects cross-file import and re-export usages", () => {
    // Act
    const actualUsages = collectFixtureUsages();

    // Assert
    expect(actualUsages).toStrictEqual(
      expect.arrayContaining([
        { importedName: "default", isTestFile: false },
        { importedName: "feature", isTestFile: false },
        { importedName: "feature", isTestFile: false },
        { importedName: "feature", isTestFile: false },
        { importedName: "feature", isTestFile: true },
      ]),
    );
  });

  it("collects import and re-export names from ts nodes", () => {
    // Arrange
    const sourceFile = ts.createSourceFile(
      "feature.ts",
      [
        'import defaultImport, { original as renamed } from "./feature";',
        'export { sourceName as exportedName } from "./feature";',
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    const [importStatement, exportStatement] = sourceFile.statements;

    // Act
    const actualResult = {
      exportNames: collectExportDeclarationNames(
        exportStatement as Parameters<typeof collectExportDeclarationNames>[0],
      ),
      importNames: collectImportDeclarationNames(
        importStatement as Parameters<typeof collectImportDeclarationNames>[0],
      ),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      exportNames: ["sourceName"],
      importNames: ["default", "original"],
    });
  });

  it("collects unaliased re-export names when propertyName is absent", () => {
    // Arrange
    const sourceFile = ts.createSourceFile(
      "feature.ts",
      'export { directName } from "./feature";',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const [exportStatement] = sourceFile.statements;

    // Act
    const actualNames = collectExportDeclarationNames(
      exportStatement as Parameters<typeof collectExportDeclarationNames>[0],
    );

    // Assert
    expect(actualNames).toStrictEqual(["directName"]);
  });

  it("skips malformed export declarations that do not provide names", () => {
    // Arrange
    const malformedBody = [
      {
        declaration: {
          type: "FunctionDeclaration",
        },
        specifiers: [],
        type: "ExportNamedDeclaration",
      },
      {
        declaration: {
          type: "VariableDeclaration",
        },
        specifiers: [],
        type: "ExportNamedDeclaration",
      },
      {
        declaration: void 0,
        source: {
          type: "Literal",
          value: "./feature",
        },
        specifiers: [
          {
            exported: {
              type: "Literal",
              value: "renamed",
            },
            local: {
              type: "Literal",
              value: "local",
            },
            type: "ExportSpecifier",
          },
        ],
        type: "ExportNamedDeclaration",
      },
      {
        declaration: void 0,
        source: void 0,
        specifiers: [
          {
            exported: {
              type: "Literal",
              value: "renamed",
            },
            local: {
              type: "Literal",
              value: "local",
            },
            type: "ExportSpecifier",
          },
        ],
        type: "ExportNamedDeclaration",
      },
    ] as unknown as AST.Program["body"];

    // Act
    const actualExportedElements = collectExportedElements(malformedBody);

    // Assert
    expect(actualExportedElements).toStrictEqual([]);
  });

  it("returns wildcard names for export-all and namespace-export clauses", () => {
    // Arrange
    const sourceFile = ts.createSourceFile(
      "feature.ts",
      [
        'export * from "./feature";',
        'export * as featureNamespace from "./feature";',
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const [exportAllStatement, namespaceExportStatement] =
      sourceFile.statements;

    // Act
    const actualResult = {
      exportAll: collectExportDeclarationNames(
        exportAllStatement as Parameters<
          typeof collectExportDeclarationNames
        >[0],
      ),
      namespaceExport: collectExportDeclarationNames(
        namespaceExportStatement as Parameters<
          typeof collectExportDeclarationNames
        >[0],
      ),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      exportAll: [wildcardExportName],
      namespaceExport: [wildcardExportName],
    });
  });

  it("collects import names for side-effect, default-only, and namespace imports", () => {
    // Arrange
    const sourceFile = ts.createSourceFile(
      "feature.ts",
      [
        'import "./feature";',
        'import featureDefault from "./feature";',
        'import * as featureNamespace from "./feature";',
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const [sideEffectImport, defaultImport, namespaceImport] =
      sourceFile.statements;

    // Act
    const actualResult = {
      defaultOnly: collectImportDeclarationNames(
        defaultImport as Parameters<typeof collectImportDeclarationNames>[0],
      ),
      namespace: collectImportDeclarationNames(
        namespaceImport as Parameters<typeof collectImportDeclarationNames>[0],
      ),
      sideEffectOnly: collectImportDeclarationNames(
        sideEffectImport as Parameters<typeof collectImportDeclarationNames>[0],
      ),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      defaultOnly: ["default"],
      namespace: [wildcardExportName],
      sideEffectOnly: [],
    });
  });

  it("returns no TypeScript program without parser services", () => {
    // Arrange
    const sourceCode = new SourceCode(
      "",
      parseProgram("export const value = 1;"),
    );
    const context = {
      filename: path.join(cwd(), "src", "feature.ts"),
      options: [getOptions([])],
      report: () => {
        throw new Error("report should not be called");
      },
      sourceCode,
    } as unknown as Rule.RuleContext;

    // Act
    const actualProgram = getTypeScriptProgram(context);

    // Assert
    expect(actualProgram).toBeUndefined();
  });

  it("handles fallback branches for unsupported patterns and unresolved modules", () => {
    // Act
    const actual = collectFallbackBranchResult();

    // Assert
    expect(actual).toStrictEqual({
      exportedNames: ["renamed", "feature"],
      unresolved: void 0,
      unsupportedPatternNames: [],
    });
  });
});
