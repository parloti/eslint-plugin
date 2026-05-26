import type { AST, Rule } from "eslint";

import { ESLintUtils } from "@typescript-eslint/utils";
import path from "node:path";
import * as ts from "typescript";

import type {
  ExportedElement,
  ExportUsage,
  NoUnusedExportsState,
} from "./types";

import { isTestFile } from "./no-unused-exports-options";

/** Wildcard marker used for export-all and namespace usage matching. */
const wildcardExportName = "*";

/**
 * Normalizes an absolute file path for safe equality checks.
 * @param inputPath Candidate path.
 * @returns Normalized absolute path suitable for cross-platform comparisons.
 * @example
 * ```typescript
 * const comparable = toComparableAbsolutePath("/repo/src/feature.ts");
 * ```
 */
const toComparableAbsolutePath = (inputPath: string): string => {
  const absolutePath = path.normalize(path.resolve(inputPath));

  return absolutePath.toLowerCase();
};

/**
 * Converts one unknown value into an indexable record.
 * @param value Candidate value.
 * @returns Record view when the value is object-like.
 * @example
 * ```typescript
 * const record = asRecord({ type: "Identifier" });
 * ```
 */
const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : void 0;

/**
 * Reads one string property from an object-like value.
 * @param value Candidate object.
 * @param key Lookup key used to read the property.
 * @returns String value when present.
 * @example
 * ```typescript
 * const name = readStringProperty({ name: "feature" }, "name");
 * ```
 */
const readStringProperty = (
  value: unknown,
  key: string,
): string | undefined => {
  const record = asRecord(value);
  const property = record?.[key];
  return typeof property === "string" ? property : void 0;
};

/**
 * Reads one array property from an object-like value.
 * @param value Candidate object.
 * @param key Lookup key used to read the property.
 * @returns Array value when present.
 * @example
 * ```typescript
 * const items = readArrayProperty({ elements: [1, 2] }, "elements");
 * ```
 */
const readArrayProperty = (
  value: unknown,
  key: string,
): undefined | unknown[] => {
  const record = asRecord(value);
  const property = record?.[key];
  return Array.isArray(property) ? property : void 0;
};

/**
 * Resolves TypeScript parser services program when available.
 * @param context Rule context.
 * @returns TypeScript program when available.
 * @example
 * ```typescript
 * const program = getTypeScriptProgram(context);
 * ```
 */
const getTypeScriptProgram = (
  context: Rule.RuleContext,
): ts.Program | undefined => {
  try {
    const services = ESLintUtils.getParserServices(context as never);
    return services.program;
  } catch {
    return void 0;
  }
};

/**
 * Collects identifier names from one variable pattern.
 * @param node Variable pattern candidate.
 * @returns Identifier names declared by the pattern.
 * @example
 * ```typescript
 * const names = collectPatternIdentifierNames(pattern);
 * ```
 */
const collectPatternIdentifierNames = (node: unknown): string[] => {
  const pattern = asRecord(node);

  if (pattern === void 0) {
    return [];
  }

  const patternType = readStringProperty(pattern, "type");

  if (patternType === "Identifier") {
    const name = readStringProperty(pattern, "name");
    return name === void 0 ? [] : [name];
  }

  if (patternType === "RestElement") {
    return collectPatternIdentifierNames(pattern["argument"]);
  }

  if (patternType === "AssignmentPattern") {
    return collectPatternIdentifierNames(pattern["left"]);
  }

  if (patternType === "ArrayPattern") {
    return (readArrayProperty(pattern, "elements") ?? []).flatMap((element) =>
      collectPatternIdentifierNames(element),
    );
  }

  if (patternType === "ObjectPattern") {
    return (readArrayProperty(pattern, "properties") ?? []).flatMap(
      (property) => {
        if (readStringProperty(property, "type") === "RestElement") {
          return collectPatternIdentifierNames(
            asRecord(property)?.["argument"],
          );
        }

        return collectPatternIdentifierNames(asRecord(property)?.["value"]);
      },
    );
  }

  return [];
};

/**
 * Reads one export specifier name.
 * @param specifier Export specifier candidate.
 * @returns Exported name when available.
 * @example
 * ```typescript
 * const name = getExportSpecifierName(specifier);
 * ```
 */
const getExportSpecifierName = (specifier: unknown): string | undefined => {
  const candidate = asRecord(specifier);
  const exportedName = readStringProperty(candidate?.["exported"], "name");

  if (typeof exportedName === "string") {
    return exportedName;
  }

  const localName = readStringProperty(candidate?.["local"], "name");

  return typeof localName === "string" ? localName : void 0;
};

/**
 * Collects exported elements from one program body.
 * @param body Program body statements.
 * @returns Exported elements in declaration order.
 * @example
 * ```typescript
 * const exported = collectExportedElements(program.body);
 * ```
 */
const collectExportedElements = (
  body: AST.Program["body"],
): ExportedElement[] => {
  const exportedElements: ExportedElement[] = [];

  for (const statement of body) {
    if (statement.type === "ExportDefaultDeclaration") {
      exportedElements.push({ exportedName: "default", node: statement });
      continue;
    }

    if (statement.type === "ExportAllDeclaration") {
      exportedElements.push({
        exportedName: wildcardExportName,
        node: statement,
      });
      continue;
    }

    if (statement.type !== "ExportNamedDeclaration") {
      continue;
    }

    if (statement.source !== null && statement.source !== void 0) {
      for (const specifier of statement.specifiers) {
        const exportedName = getExportSpecifierName(specifier);

        if (exportedName !== void 0) {
          exportedElements.push({ exportedName, node: statement });
        }
      }

      continue;
    }

    if (statement.declaration !== null && statement.declaration !== void 0) {
      const declaration = asRecord(statement.declaration);

      if (readStringProperty(declaration, "type") === "VariableDeclaration") {
        for (const variable of readArrayProperty(declaration, "declarations") ??
          []) {
          for (const name of collectPatternIdentifierNames(
            asRecord(variable)?.["id"],
          )) {
            exportedElements.push({ exportedName: name, node: statement });
          }
        }
      } else {
        const declarationName = readStringProperty(declaration?.["id"], "name");

        if (typeof declarationName === "string") {
          exportedElements.push({
            exportedName: declarationName,
            node: statement,
          });
        }
      }

      continue;
    }

    for (const specifier of statement.specifiers) {
      const exportedName = getExportSpecifierName(specifier);

      if (exportedName !== void 0) {
        exportedElements.push({ exportedName, node: statement });
      }
    }
  }

  return exportedElements;
};

/**
 * Resolves one import/export module specifier against a source file.
 * @param moduleSpecifier Raw module specifier text.
 * @param sourceFileFileName Source file where the specifier appears.
 * @param program TypeScript program.
 * @returns Resolved absolute path when available.
 * @example
 * ```typescript
 * const resolved = resolveModuleSpecifier("./feature", "/repo/src/index.ts", program);
 * ```
 */
const resolveModuleSpecifier = (
  moduleSpecifier: string,
  sourceFileFileName: string,
  program: ts.Program,
): string | undefined => {
  const resolved = ts.resolveModuleName(
    moduleSpecifier,
    sourceFileFileName,
    program.getCompilerOptions(),
    ts.sys,
  ).resolvedModule;

  if (resolved === void 0) {
    return void 0;
  }

  return path.resolve(resolved.resolvedFileName);
};

/**
 * Collects imported names from one import declaration.
 * @param statement Import declaration node to inspect.
 * @returns Imported names.
 * @example
 * ```typescript
 * const names = collectImportDeclarationNames(statement);
 * ```
 */
const collectImportDeclarationNames = (
  statement: ts.ImportDeclaration,
): string[] => {
  const importClause = statement.importClause;

  if (importClause === void 0) {
    return [];
  }

  const importedNames: string[] = [];

  if (importClause.name !== void 0) {
    importedNames.push("default");
  }

  const namedBindings = importClause.namedBindings;

  if (namedBindings === void 0) {
    return importedNames;
  }

  if (ts.isNamespaceImport(namedBindings)) {
    importedNames.push(wildcardExportName);
    return importedNames;
  }

  for (const element of namedBindings.elements) {
    importedNames.push(element.propertyName?.text ?? element.name.text);
  }

  return importedNames;
};

/**
 * Collects imported names from one re-export declaration.
 * @param statement Re-export declaration.
 * @returns Imported names.
 * @example
 * ```typescript
 * const names = collectExportDeclarationNames(statement);
 * ```
 */
const collectExportDeclarationNames = (
  statement: ts.ExportDeclaration,
): string[] => {
  const exportClause = statement.exportClause;

  if (exportClause === void 0) {
    return [wildcardExportName];
  }

  if (!ts.isNamedExports(exportClause)) {
    return [wildcardExportName];
  }

  return exportClause.elements.map(
    (element) => element.propertyName?.text ?? element.name.text,
  );
};

/**
 * Checks whether one imported name matches one exported name.
 * @param exportedName Exported element name.
 * @param importedName Name referenced by one import or re-export usage.
 * @returns True when the usage can consume the export.
 * @example
 * ```typescript
 * const match = doesUsageMatchExport("feature", "feature");
 * ```
 */
const doesUsageMatchExport = (
  exportedName: string,
  importedName: string,
): boolean =>
  exportedName === wildcardExportName ||
  importedName === wildcardExportName ||
  exportedName === importedName;

/**
 * Collects import/re-export usages of one module across the program.
 * @param program TypeScript program.
 * @param sourceFilename Source filename where exports are defined.
 * @param state Normalized rule options.
 * @param repoRoot Absolute repository root used for test-file classification.
 * @returns Cross-file usages for the source module.
 * @example
 * ```typescript
 * const usages = collectCrossFileUsages(program, "/repo/src/feature.ts", state, "/repo");
 * ```
 */
const collectCrossFileUsages = (
  program: ts.Program,
  sourceFilename: string,
  state: NoUnusedExportsState,
  repoRoot: string,
): ExportUsage[] => {
  const normalizedSourceFilename = toComparableAbsolutePath(sourceFilename);
  const normalizedRepoRoot = path.resolve(repoRoot);
  const usages: ExportUsage[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    const consumerFilename = path.resolve(sourceFile.fileName);
    const normalizedConsumerFilename =
      toComparableAbsolutePath(consumerFilename);

    if (normalizedConsumerFilename === normalizedSourceFilename) {
      continue;
    }

    const consumerIsTestFile = isTestFile(
      consumerFilename,
      state,
      normalizedRepoRoot,
    );

    for (const statement of sourceFile.statements) {
      if (
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        const resolved = resolveModuleSpecifier(
          statement.moduleSpecifier.text,
          consumerFilename,
          program,
        );

        if (
          resolved === void 0 ||
          toComparableAbsolutePath(resolved) !== normalizedSourceFilename
        ) {
          continue;
        }

        for (const importedName of collectImportDeclarationNames(statement)) {
          usages.push({ importedName, isTestFile: consumerIsTestFile });
        }

        continue;
      }

      if (
        ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier !== void 0 &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        const resolved = resolveModuleSpecifier(
          statement.moduleSpecifier.text,
          consumerFilename,
          program,
        );

        if (
          resolved === void 0 ||
          toComparableAbsolutePath(resolved) !== normalizedSourceFilename
        ) {
          continue;
        }

        for (const importedName of collectExportDeclarationNames(statement)) {
          usages.push({ importedName, isTestFile: consumerIsTestFile });
        }
      }
    }
  }

  return usages;
};

/**
 * Classifies one exported name based on cross-file usages.
 * @param exportedName Exported element name.
 * @param usages Collected usages.
 * @returns Classification label.
 * @example
 * ```typescript
 * const classification = classifyExportUsage("feature", usages);
 * ```
 */
const classifyExportUsage = (
  exportedName: string,
  usages: ExportUsage[],
): "production" | "test-only" | "unused" => {
  let hasTestUsage = false;

  for (const usage of usages) {
    if (!doesUsageMatchExport(exportedName, usage.importedName)) {
      continue;
    }

    if (!usage.isTestFile) {
      return "production";
    }

    hasTestUsage = true;
  }

  return hasTestUsage ? "test-only" : "unused";
};

export {
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
};
