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
 * Creates one fake symbol for branch-focused type-checker tests.
 * @param fileName Source file that owns the declaration.
 * @param declarationName Symbol name used for diagnostics.
 * @param pos Declaration start position.
 * @returns Fake symbol with one declaration key.
 * @example
 * ```typescript
 * const symbol = createFakeSymbol("/repo/src/feature.ts", "feature", 0);
 * ```
 */
const createFakeSymbol = (
  fileName: string,
  declarationName: string,
  pos: number,
): ts.Symbol =>
  ({
    declarations: [
      {
        end: pos + 1,
        getSourceFile: () => ({ fileName }) as ts.SourceFile,
        pos,
      } as never,
    ],
    flags: 0,
    getName: () => declarationName,
  }) as never;

/**
 * Creates one fake program with just the members used by the utility tests.
 * @param sourceFiles Source files exposed by the fake program.
 * @param checker Type checker used by the fake program.
 * @returns Fake TypeScript program.
 * @example
 * ```typescript
 * const program = createFakeProgram([], {} as never);
 * ```
 */
const createFakeProgram = (
  sourceFiles: ts.SourceFile[],
  checker: ts.TypeChecker,
): ts.Program =>
  ({
    getSourceFiles: () => sourceFiles,
    getTypeChecker: () => checker,
  }) as never;

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
    const packageDirectory = path.join(temporaryRoot, "packages", "pkg");
    const sourceDirectory = path.join(packageDirectory, "src");
    const testsDirectory = path.join(packageDirectory, "tests");

    mkdirSync(sourceDirectory, { recursive: true });
    mkdirSync(testsDirectory, { recursive: true });

    const featureFile = path.join(sourceDirectory, "feature.ts");
    const consumerFile = path.join(sourceDirectory, "consumer.ts");
    const exporterFile = path.join(sourceDirectory, "exporter.ts");
    const importOnlyFile = path.join(sourceDirectory, "import-only.ts");
    const labelFile = path.join(sourceDirectory, "label.ts");
    const missingFile = path.join(sourceDirectory, "missing.ts");
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
    writeFileSync(
      exporterFile,
      ["import { feature } from './feature';", "export { feature };"].join(
        "\n",
      ),
    );
    writeFileSync(importOnlyFile, "import { feature } from './feature';\n");
    writeFileSync(labelFile, "feature: void 0;\n");
    writeFileSync(missingFile, "feature;\n");
    writeFileSync(
      testConsumerFile,
      "import { feature } from '../src/feature';\nvoid feature;\n",
    );

    const program = ts.createProgram(
      [
        featureFile,
        consumerFile,
        exporterFile,
        importOnlyFile,
        labelFile,
        missingFile,
        otherFile,
        testConsumerFile,
      ],
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

    const state = getOptions([
      {
        publicApiFiles: ["src/index.ts", "src/other-index.ts"],
      },
    ]);

    return collectCrossFileUsages(program, featureFile, state, temporaryRoot, {
      exportedName: "feature",
      exportKind: "value",
      node: { type: "ExportNamedDeclaration" } as never,
    });
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
    const packageDirectory = path.join(temporaryRoot, "packages", "pkg");
    const otherPackageDirectory = path.join(temporaryRoot, "packages", "other");
    const sourceDirectory = path.join(packageDirectory, "src");
    const otherSourceDirectory = path.join(otherPackageDirectory, "src");

    mkdirSync(sourceDirectory, { recursive: true });
    mkdirSync(otherSourceDirectory, { recursive: true });

    const featureFile = path.join(sourceDirectory, "feature.ts");
    const infrastructureFile = path.join(sourceDirectory, "infrastructure.ts");
    const emptyPublicApiFile = path.join(sourceDirectory, "empty.ts");
    const publicApiFile = path.join(sourceDirectory, "index.ts");
    const otherPublicApiFile = path.join(otherSourceDirectory, "index.ts");

    writeFileSync(featureFile, "export const feature = 1;\n");
    writeFileSync(infrastructureFile, "export { feature } from './feature';\n");
    writeFileSync(emptyPublicApiFile, "\n");
    writeFileSync(otherPublicApiFile, "export const other = 1;\n");
    writeFileSync(
      publicApiFile,
      "export { feature } from './infrastructure';\n",
    );

    const program = ts.createProgram(
      [
        featureFile,
        infrastructureFile,
        emptyPublicApiFile,
        otherPublicApiFile,
        publicApiFile,
      ],
      {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ESNext,
      },
    );

    return collectCrossFileUsages(
      program,
      featureFile,
      getOptions([
        {
          publicApiFiles: [
            "packages/pkg/src/empty.ts",
            "packages/pkg/src/index.ts",
            "packages/other/src/index.ts",
          ],
        },
      ]),
      temporaryRoot,
      {
        exportedName: "feature",
        exportKind: "value",
        node: { type: "ExportNamedDeclaration" } as never,
      },
    );
  });

/**
 * Builds one temporary project where the only consumer uses the export as a
 * shorthand property value through a multi-level barrel chain.
 * @returns Collected usages for the `feature` value export.
 * @example
 * ```typescript
 * const usages = collectShorthandPropertyFixtureUsages();
 * ```
 */
const collectShorthandPropertyFixtureUsages = () =>
  withTemporaryDirectory("no-unused-shorthand-", (temporaryRoot) => {
    const sourceDirectory = path.join(temporaryRoot, "src");
    mkdirSync(sourceDirectory, { recursive: true });

    const featureFile = path.join(sourceDirectory, "feature.ts");
    const barrelFile = path.join(sourceDirectory, "barrel.ts");
    const consumerFile = path.join(sourceDirectory, "consumer.ts");

    writeFileSync(
      featureFile,
      [
        "function buildFeature(x: string): string { return x; }",
        "export { buildFeature };",
      ].join("\n") + "\n",
    );
    writeFileSync(barrelFile, "export { buildFeature } from './feature';\n");
    writeFileSync(
      consumerFile,
      [
        "import { buildFeature } from './barrel';",
        "function configure(opts: { buildFeature: (x: string) => string }): void { void opts; }",
        "configure({ buildFeature });",
      ].join("\n") + "\n",
    );

    const program = ts.createProgram([featureFile, barrelFile, consumerFile], {
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
        exportedName: "buildFeature",
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

  it("ignores malformed declaration candidates while collecting local names", () => {
    // Arrange
    const malformedBody = [
      {
        declaration: {
          id: { name: "broken" },
        },
        source: void 0,
        specifiers: [],
        type: "ExportNamedDeclaration",
      },
      {
        declarations: [void 0],
        kind: "const",
        type: "VariableDeclaration",
      },
    ] as unknown as AST.Program["body"];

    // Act
    const actualExportedElements = collectExportedElements(malformedBody).map(
      (element) => ({
        exportedName: element.exportedName,
        exportKind: element.exportKind,
      }),
    );

    // Assert
    expect(actualExportedElements).toStrictEqual([
      {
        exportedName: "broken",
        exportKind: "value",
      },
    ]);
  });

  it("collects exported names from pattern-based declarations", () => {
    // Arrange
    const program = parseProgram(
      [
        "const source = { alias: 1, nested: { inner: 2 }, list: [3] };",
        "export const [first, second = source.alias, ...rest] = source.list;",
        "export const { alias: renamed, nested: { inner }, ...others } = source;",
        "export function buildFeature() {}",
        "export class FeatureClass {}",
        "export enum FeatureEnum { A }",
        "export interface FeatureShape { readonly id: string; }",
        "export type FeatureAlias = string;",
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
      { exportedName: "first", exportKind: "value" },
      { exportedName: "second", exportKind: "value" },
      { exportedName: "rest", exportKind: "value" },
      { exportedName: "renamed", exportKind: "value" },
      { exportedName: "inner", exportKind: "value" },
      { exportedName: "others", exportKind: "value" },
      { exportedName: "buildFeature", exportKind: "value" },
      { exportedName: "FeatureClass", exportKind: "value" },
      { exportedName: "FeatureEnum", exportKind: "value" },
      { exportedName: "FeatureShape", exportKind: "type" },
      { exportedName: "FeatureAlias", exportKind: "type" },
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

  it("detects value export consumed as a shorthand property through a barrel chain", () => {
    // Act
    const actualUsages = collectShorthandPropertyFixtureUsages();

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

  it("returns no usages when the source filename is missing from the program", () => {
    // Arrange
    const missingFilename = "missing.ts";

    // Act
    const actualUsages = withTemporaryDirectory(
      "no-unused-missing-file-",
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

        // Act
        return collectCrossFileUsages(
          program,
          path.join(sourceDirectory, missingFilename),
          getOptions([]),
          temporaryRoot,
          {
            exportedName: "feature",
            exportKind: "value",
            node: { type: "ExportNamedDeclaration" } as never,
          },
        );
      },
    );

    // Assert
    expect(actualUsages).toStrictEqual([]);
  });

  it("returns no usages for source files without a module symbol", () => {
    // Arrange & Act
    const actualUsages = withTemporaryDirectory(
      "no-unused-script-",
      (temporaryRoot) => {
        const sourceDirectory = path.join(temporaryRoot, "src");
        mkdirSync(sourceDirectory, { recursive: true });

        const scriptFile = path.join(sourceDirectory, "script.ts");
        writeFileSync(scriptFile, "const scriptOnly = 1;\nscriptOnly;\n");

        const program = ts.createProgram([scriptFile], {
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          target: ts.ScriptTarget.ESNext,
        });

        // Act
        return collectCrossFileUsages(
          program,
          scriptFile,
          getOptions([]),
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

  it("returns no usages for public API files without exports", () => {
    // Arrange & Act
    const actualUsages = withTemporaryDirectory(
      "no-unused-empty-public-api-",
      (temporaryRoot) => {
        const sourceDirectory = path.join(temporaryRoot, "src");
        mkdirSync(sourceDirectory, { recursive: true });

        const featureFile = path.join(sourceDirectory, "feature.ts");
        const emptyPublicApiFile = path.join(sourceDirectory, "empty.ts");

        writeFileSync(featureFile, "export const feature = 1;\n");
        writeFileSync(emptyPublicApiFile, "const placeholder = 1;\n");

        const program = ts.createProgram([featureFile, emptyPublicApiFile], {
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          target: ts.ScriptTarget.ESNext,
        });
        const state = getOptions([
          {
            publicApiFiles: ["src/empty.ts"],
          },
        ]);

        // Act
        return collectCrossFileUsages(
          program,
          featureFile,
          state,
          temporaryRoot,
          {
            exportedName: "feature",
            exportKind: "value",
            node: { type: "ExportNamedDeclaration" } as never,
          },
        );
      },
    );

    // Assert
    expect(actualUsages).toStrictEqual([]);
  });

  it("returns no usages for public API files exporting other symbols", () => {
    // Arrange & Act
    const actualUsages = withTemporaryDirectory(
      "no-unused-other-public-api-",
      (temporaryRoot) => {
        const sourceDirectory = path.join(temporaryRoot, "src");
        mkdirSync(sourceDirectory, { recursive: true });

        const featureFile = path.join(sourceDirectory, "feature.ts");
        const otherPublicApiFile = path.join(sourceDirectory, "index.ts");

        writeFileSync(featureFile, "export const feature = 1;\n");
        writeFileSync(otherPublicApiFile, "export const other = 1;\n");

        const program = ts.createProgram([featureFile, otherPublicApiFile], {
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          target: ts.ScriptTarget.ESNext,
        });
        const state = getOptions([
          {
            publicApiFiles: ["src/index.ts"],
          },
        ]);

        // Act
        return collectCrossFileUsages(
          program,
          featureFile,
          state,
          temporaryRoot,
          {
            exportedName: "feature",
            exportKind: "value",
            node: { type: "ExportNamedDeclaration" } as never,
          },
        );
      },
    );

    // Assert
    expect(actualUsages).toStrictEqual([]);
  });

  it("resolves aliased public API exports when alias resolution fails", () => {
    // Arrange & Act
    const actualUsages = withTemporaryDirectory(
      "no-unused-alias-fallback-",
      (temporaryRoot) => {
        const sourceDirectory = path.join(temporaryRoot, "src");
        mkdirSync(sourceDirectory, { recursive: true });

        const featureFile = path.join(sourceDirectory, "feature.ts");
        const apiFile = path.join(sourceDirectory, "index.ts");

        const featureSourceFile = ts.createSourceFile(
          featureFile,
          "export const feature = 1;\n",
          ts.ScriptTarget.ESNext,
          true,
          ts.ScriptKind.TS,
        );
        const apiSourceFile = ts.createSourceFile(
          apiFile,
          "export { feature as exposed } from './feature';\n",
          ts.ScriptTarget.ESNext,
          true,
          ts.ScriptKind.TS,
        );

        const featureSymbol = createFakeSymbol(featureFile, "feature", 0);
        const exposedSymbol = createFakeSymbol(featureFile, "feature", 0);
        const moduleSymbolFeature = { fileName: featureFile } as never;
        const moduleSymbolApi = { fileName: apiFile } as never;

        const checker = {
          getAliasedSymbol: () => {
            throw new Error("alias resolution unavailable");
          },
          getExportsOfModule: (moduleSymbol: unknown) => {
            if (moduleSymbol === moduleSymbolFeature) {
              return [featureSymbol];
            }

            if (moduleSymbol === moduleSymbolApi) {
              return [exposedSymbol];
            }

            return [];
          },
          getSymbolAtLocation: (node: unknown) => {
            if (node === featureSourceFile) {
              return moduleSymbolFeature;
            }

            if (node === apiSourceFile) {
              return moduleSymbolApi;
            }

            return void 0;
          },
        } as never;

        const program = createFakeProgram(
          [featureSourceFile, apiSourceFile],
          checker,
        );
        const state = getOptions([{ publicApiFiles: ["src/index.ts"] }]);

        // Act
        return collectCrossFileUsages(
          program,
          featureFile,
          state,
          temporaryRoot,
          {
            exportedName: "feature",
            exportKind: "value",
            node: { type: "ExportNamedDeclaration" } as never,
          },
        );
      },
    );

    // Assert
    expect(actualUsages).toStrictEqual([{ isTestFile: false }]);
  });

  it("returns no usages when public API exports resolve to different symbols", () => {
    // Arrange & Act
    const actualUsages = withTemporaryDirectory(
      "no-unused-public-api-miss-",
      (temporaryRoot) => {
        const sourceDirectory = path.join(temporaryRoot, "src");
        mkdirSync(sourceDirectory, { recursive: true });

        const featureFile = path.join(sourceDirectory, "feature.ts");
        const apiFile = path.join(sourceDirectory, "index.ts");

        const featureSourceFile = ts.createSourceFile(
          featureFile,
          "export const feature = 1;\n",
          ts.ScriptTarget.ESNext,
          true,
          ts.ScriptKind.TS,
        );
        const apiSourceFile = ts.createSourceFile(
          apiFile,
          "export const other = 1;\n",
          ts.ScriptTarget.ESNext,
          true,
          ts.ScriptKind.TS,
        );

        const featureSymbol = createFakeSymbol(featureFile, "feature", 0);
        const otherSymbol = createFakeSymbol(apiFile, "other", 0);
        const moduleSymbolFeature = { fileName: featureFile } as never;
        const moduleSymbolApi = { fileName: apiFile } as never;

        const checker = {
          getAliasedSymbol: (symbol: ts.Symbol) => symbol,
          getExportsOfModule: (moduleSymbol: unknown) => {
            if (moduleSymbol === moduleSymbolFeature) {
              return [featureSymbol];
            }

            if (moduleSymbol === moduleSymbolApi) {
              return [otherSymbol];
            }

            return [];
          },
          getSymbolAtLocation: (node: unknown) => {
            if (node === featureSourceFile) {
              return moduleSymbolFeature;
            }

            if (node === apiSourceFile) {
              return moduleSymbolApi;
            }

            return void 0;
          },
        } as never;

        const program = createFakeProgram(
          [featureSourceFile, apiSourceFile],
          checker,
        );
        const state = getOptions([{ publicApiFiles: ["src/index.ts"] }]);

        // Act
        return collectCrossFileUsages(
          program,
          featureFile,
          state,
          temporaryRoot,
          {
            exportedName: "feature",
            exportKind: "value",
            node: { type: "ExportNamedDeclaration" } as never,
          },
        );
      },
    );

    // Assert
    expect(actualUsages).toStrictEqual([]);
  });

  it("classifies concrete usages across production, test, type, and public API consumers", () => {
    // Arrange & Act
    const actualResult = withTemporaryDirectory(
      "no-unused-mixed-",
      (temporaryRoot) => {
        const sourceDirectory = path.join(temporaryRoot, "src");
        const testsDirectory = path.join(temporaryRoot, "tests");

        mkdirSync(sourceDirectory, { recursive: true });
        mkdirSync(testsDirectory, { recursive: true });

        const featureFile = path.join(sourceDirectory, "feature.ts");
        const consumerFile = path.join(sourceDirectory, "consumer.ts");
        const typeConsumerFile = path.join(sourceDirectory, "type-consumer.ts");
        const shadowFile = path.join(sourceDirectory, "shadow.ts");
        const publicApiFile = path.join(sourceDirectory, "index.ts");
        const testFile = path.join(testsDirectory, "feature.spec.ts");

        writeFileSync(
          featureFile,
          "export const feature = { id: 1 } as const;\n",
        );
        writeFileSync(
          consumerFile,
          ["import { feature } from './feature';", "void feature.id;"].join(
            "\n",
          ),
        );
        writeFileSync(
          typeConsumerFile,
          [
            "import { feature } from './feature';",
            "export type FeatureShape = typeof feature;",
          ].join("\n"),
        );
        writeFileSync(
          shadowFile,
          ["const feature = 1;", "void feature;"].join("\n"),
        );
        writeFileSync(publicApiFile, "export { feature } from './feature';\n");
        writeFileSync(
          testFile,
          [
            "import { feature } from '../src/feature';",
            "void feature.id;",
          ].join("\n"),
        );

        const program = ts.createProgram(
          [
            featureFile,
            consumerFile,
            typeConsumerFile,
            shadowFile,
            publicApiFile,
            testFile,
          ],
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

        // Act
        const actualUsages = collectCrossFileUsages(
          program,
          featureFile,
          state,
          temporaryRoot,
          {
            exportedName: "feature",
            exportKind: "value",
            node: { type: "ExportNamedDeclaration" } as never,
          },
        );

        return {
          actualUsages,
          classification: classifyExportUsage(actualUsages),
        };
      },
    );

    // Assert
    expect(actualResult.actualUsages).toContainEqual({ isTestFile: false });
    expect(actualResult.actualUsages).toContainEqual({ isTestFile: true });
    expect(actualResult.classification).toBe("production");
  });
});
