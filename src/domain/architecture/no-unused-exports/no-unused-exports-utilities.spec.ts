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
  collectExportedElements,
  getTypeScriptProgram,
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
 * Runs one callback inside a temporary directory and always cleans up.
 * @param prefix Prefix used for temporary directory names.
 * @param callback Operation to execute inside the temp directory.
 * @returns Callback return value.
 * @example
 * ```typescript
 * const result = withTemporaryDirectory("fixture-", (root) => root);
 * ```
 */
const withTemporaryDirectory = <Result>(
  prefix: string,
  callback: (temporaryRoot: string) => Result,
): Result => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), prefix));

  try {
    return callback(temporaryRoot);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

/**
 * Builds one temporary project and collects concrete usages for one exported value.
 * @returns Collected usages for `feature` export.
 * @example
 * ```typescript
 * const usages = collectValueFixtureUsages();
 * ```
 */
const collectValueFixtureUsages = () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), "no-unused-exports-"));

  try {
    const sourceDirectory = path.join(temporaryRoot, "src");
    const testsDirectory = path.join(temporaryRoot, "tests");

    mkdirSync(sourceDirectory, { recursive: true });
    mkdirSync(testsDirectory, { recursive: true });

    const featureFile = path.join(sourceDirectory, "feature.ts");
    const consumerFile = path.join(sourceDirectory, "consumer.ts");
    const importOnlyFile = path.join(sourceDirectory, "import-only.ts");
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
      ].join("\n"),
    );
    writeFileSync(importOnlyFile, "import { feature } from './feature';\n");
    writeFileSync(
      testConsumerFile,
      "import { feature } from '../src/feature';\nvoid feature;\n",
    );

    const program = ts.createProgram(
      [featureFile, consumerFile, importOnlyFile, otherFile, testConsumerFile],
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

    return collectCrossFileUsages(program, featureFile, state, temporaryRoot, {
      exportedName: "feature",
      exportKind: "value",
      node: { type: "ExportNamedDeclaration" } as never,
    });
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

/**
 * Builds one temporary project and collects concrete usages for one exported type.
 * @returns Collected usages for `Alias` export.
 * @example
 * ```typescript
 * const usages = collectTypeFixtureUsages();
 * ```
 */
const collectTypeFixtureUsages = () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), "no-unused-types-"));

  try {
    const sourceDirectory = path.join(temporaryRoot, "src");
    const testsDirectory = path.join(temporaryRoot, "tests");

    mkdirSync(sourceDirectory, { recursive: true });
    mkdirSync(testsDirectory, { recursive: true });

    const featureFile = path.join(sourceDirectory, "feature.ts");
    const consumerFile = path.join(sourceDirectory, "consumer.ts");
    const testConsumerFile = path.join(testsDirectory, "feature.spec.ts");

    writeFileSync(
      featureFile,
      "export type Alias = { readonly id: string };\n",
    );
    writeFileSync(
      consumerFile,
      [
        "import type { Alias } from './feature';",
        "const value: Alias = { id: 'x' };",
        "void value;",
      ].join("\n"),
    );
    writeFileSync(
      testConsumerFile,
      [
        "import type { Alias } from '../src/feature';",
        "type Local = Alias;",
      ].join("\n"),
    );

    const program = ts.createProgram(
      [featureFile, consumerFile, testConsumerFile],
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

    return collectCrossFileUsages(program, featureFile, state, temporaryRoot, {
      exportedName: "Alias",
      exportKind: "type",
      node: { type: "ExportNamedDeclaration" } as never,
    });
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

/**
 * Builds one temporary project whose export is only forwarded by a regular file.
 * @returns Collected usages for the forwarded `feature` export.
 * @example
 * ```typescript
 * const usages = collectForwardingOnlyFixtureUsages();
 * ```
 */
const collectForwardingOnlyFixtureUsages = () =>
  withTemporaryDirectory("no-unused-forwarding-", (temporaryRoot) => {
    const sourceDirectory = path.join(temporaryRoot, "src");
    mkdirSync(sourceDirectory, { recursive: true });

    const featureFile = path.join(sourceDirectory, "feature.ts");
    const barrelFile = path.join(sourceDirectory, "barrel.ts");

    writeFileSync(featureFile, "export const feature = 1;\n");
    writeFileSync(barrelFile, "export { feature } from './feature';\n");

    const program = ts.createProgram([featureFile, barrelFile], {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ESNext,
    });

    return collectCrossFileUsages(
      program,
      featureFile,
      getOptions([]),
      temporaryRoot,
      {
        exportedName: "feature",
        exportKind: "value",
        node: { type: "ExportNamedDeclaration" } as never,
      },
    );
  });

/**
 * Builds one temporary project whose export is exposed through the public API.
 * @returns Collected usages for the public `feature` export.
 * @example
 * ```typescript
 * const usages = collectPublicApiFixtureUsages();
 * ```
 */
const collectPublicApiFixtureUsages = () =>
  withTemporaryDirectory("no-unused-public-api-", (temporaryRoot) => {
    const sourceDirectory = path.join(temporaryRoot, "src");
    mkdirSync(sourceDirectory, { recursive: true });

    const featureFile = path.join(sourceDirectory, "feature.ts");
    const infrastructureFile = path.join(sourceDirectory, "infrastructure.ts");
    const publicApiFile = path.join(sourceDirectory, "index.ts");

    writeFileSync(featureFile, "export const feature = 1;\n");
    writeFileSync(infrastructureFile, "export { feature } from './feature';\n");
    writeFileSync(
      publicApiFile,
      "export { feature } from './infrastructure';\n",
    );

    const program = ts.createProgram(
      [featureFile, infrastructureFile, publicApiFile],
      {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ESNext,
      },
    );

    return collectCrossFileUsages(
      program,
      featureFile,
      getOptions([]),
      temporaryRoot,
      {
        exportedName: "feature",
        exportKind: "value",
        node: { type: "ExportNamedDeclaration" } as never,
      },
    );
  });

/**
 * Builds one temporary project whose only consumer uses `typeof` on the export.
 * @returns Collected usages for the `feature` value export.
 * @example
 * ```typescript
 * const usages = collectTypeofValueFixtureUsages();
 * ```
 */
const collectTypeofValueFixtureUsages = () =>
  withTemporaryDirectory("no-unused-typeof-", (temporaryRoot) => {
    const sourceDirectory = path.join(temporaryRoot, "src");
    mkdirSync(sourceDirectory, { recursive: true });

    const featureFile = path.join(sourceDirectory, "feature.ts");
    const consumerFile = path.join(sourceDirectory, "consumer.ts");

    writeFileSync(featureFile, "export const feature = { id: 1 } as const;\n");
    writeFileSync(
      consumerFile,
      [
        "import { feature } from './feature';",
        "export type FeatureShape = typeof feature;",
      ].join("\n"),
    );

    const program = ts.createProgram([featureFile, consumerFile], {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ESNext,
    });

    return collectCrossFileUsages(
      program,
      featureFile,
      getOptions([]),
      temporaryRoot,
      {
        exportedName: "feature",
        exportKind: "value",
        node: { type: "ExportNamedDeclaration" } as never,
      },
    );
  });

describe("no-unused-exports utilities", () => {
  it("collects declaration-owned exported elements with value/type kinds", () => {
    // Arrange
    const program = parseProgram(
      [
        "export const value = 1;",
        "export type Alias = string;",
        "export interface Shape { readonly size: number; }",
        "const localValue = value;",
        "export { value as renamed };",
        "export { localValue as localAlias };",
        "export { helper } from './helper';",
        "export * from './feature';",
        "export default value;",
      ].join("\n"),
    );

    // Act
    const actualExportData = collectExportedElements(program.body).map(
      (element) => ({
        exportedName: element.exportedName,
        exportKind: element.exportKind,
      }),
    );

    // Assert
    expect(actualExportData).toStrictEqual([
      { exportedName: "value", exportKind: "value" },
      { exportedName: "Alias", exportKind: "type" },
      { exportedName: "Shape", exportKind: "type" },
      { exportedName: "renamed", exportKind: "value" },
      { exportedName: "localAlias", exportKind: "value" },
      { exportedName: "default", exportKind: "value" },
    ]);
  });

  it("classifies type-only export specifiers and reports the declaration node", () => {
    // Arrange
    const program = parseProgram(
      [
        "interface Shape { readonly size: number; }",
        "const valueOnly = 1;",
        "export type { Shape };",
        "export { valueOnly as valueAlias };",
        "export type { valueOnly as ShapeAlias };",
      ].join("\n"),
    );

    // Act
    const actualExportData = collectExportedElements(program.body).map(
      (element) => ({
        exportedName: element.exportedName,
        exportKind: element.exportKind,
        nodeType: element.node.type,
      }),
    );

    // Assert
    expect(actualExportData).toStrictEqual([
      {
        exportedName: "Shape",
        exportKind: "type",
        nodeType: "TSInterfaceDeclaration",
      },
      {
        exportedName: "valueAlias",
        exportKind: "value",
        nodeType: "VariableDeclaration",
      },
      {
        exportedName: "ShapeAlias",
        exportKind: "type",
        nodeType: "VariableDeclaration",
      },
    ]);
  });

  it("ignores pass-through re-exports and non-local export specifiers", () => {
    // Arrange
    const program = parseProgram(
      [
        "import { external } from './external';",
        "const local = 1;",
        "export { external as renamedExternal, local as renamedLocal };",
        "export { external as passThrough } from './external';",
        "export * from './external';",
      ].join("\n"),
    );

    // Act
    const actualExportedNames = collectExportedElements(program.body).map(
      (element) => element.exportedName,
    );

    // Assert
    expect(actualExportedNames).toStrictEqual(["renamedLocal"]);
  });

  it("classifies production, test-only, and unused exports", () => {
    // Arrange
    const productionUsage = [{ isTestFile: true }, { isTestFile: false }];
    const testOnlyUsage = [{ isTestFile: true }, { isTestFile: true }];

    // Act
    const actualResult = {
      production: classifyExportUsage(productionUsage),
      testOnly: classifyExportUsage(testOnlyUsage),
      unused: classifyExportUsage([]),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      production: "production",
      testOnly: "test-only",
      unused: "unused",
    });
  });

  it("collects cross-file concrete usages for value exports", () => {
    // Act
    const actualUsages = collectValueFixtureUsages();

    // Assert
    expect(actualUsages).toStrictEqual(
      expect.arrayContaining([{ isTestFile: false }, { isTestFile: true }]),
    );
  });

  it("collects cross-file concrete usages for type exports", () => {
    // Act
    const actualUsages = collectTypeFixtureUsages();

    // Assert
    expect(actualUsages).toStrictEqual(
      expect.arrayContaining([{ isTestFile: false }, { isTestFile: true }]),
    );
  });

  it("ignores forwarding-only exports outside public API files", () => {
    // Act
    const actualUsages = collectForwardingOnlyFixtureUsages();

    // Assert
    expect(actualUsages).toStrictEqual([]);
  });

  it("collects public API exposure as production usage", () => {
    // Act
    const actualUsages = collectPublicApiFixtureUsages();

    // Assert
    expect(actualUsages).toStrictEqual([{ isTestFile: false }]);
  });

  it("treats `typeof` references as concrete value usage", () => {
    // Act
    const actualUsages = collectTypeofValueFixtureUsages();

    // Assert
    expect(actualUsages).toStrictEqual([{ isTestFile: false }]);
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

  it("returns no usages when the export symbol cannot be resolved", () => {
    // Arrange
    const options = getOptions([]);

    // Act
    const actualUsages = withTemporaryDirectory(
      "no-unused-missing-",
      (temporaryRoot) => {
        const sourceDirectory = path.join(temporaryRoot, "src");
        mkdirSync(sourceDirectory, { recursive: true });

        const featureFile = path.join(sourceDirectory, "feature.ts");
        writeFileSync(featureFile, "export const feature = 1;\n");

        const program = ts.createProgram([featureFile], {
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          target: ts.ScriptTarget.ESNext,
        });

        return collectCrossFileUsages(
          program,
          featureFile,
          options,
          temporaryRoot,
          {
            exportedName: "missing",
            exportKind: "value",
            node: { type: "ExportNamedDeclaration" } as never,
          },
        );
      },
    );

    // Assert
    expect(actualUsages).toStrictEqual([]);
  });
});
