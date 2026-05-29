import type { AST, Rule } from "eslint";

import { ESLintUtils } from "@typescript-eslint/utils";
import path from "node:path";
import * as ts from "typescript";

import type {
  ExportedElement,
  ExportKind,
  ExportUsage,
  NoUnusedExportsState,
} from "./types";

import { isPublicApiFile, isTestFile } from "./no-unused-exports-options";

/** Local top-level declaration discovered when collecting export sources. */
interface LocalDeclaration {
  /** Export kind implied by the declaration. */
  kind: ExportKind;

  /** Declaration statement used for diagnostics. */
  node: AST.Program["body"][number];
}

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
 * Reads one local export specifier name.
 * @param specifier Export specifier candidate.
 * @returns Local specifier name when available.
 * @example
 * ```typescript
 * const name = getExportSpecifierLocalName(specifier);
 * ```
 */
const getExportSpecifierLocalName = (
  specifier: unknown,
): string | undefined => {
  const candidate = asRecord(specifier);

  return readStringProperty(candidate?.["local"], "name");
};

/**
 * Collects top-level declaration names owned by the current module.
 * @param body Program body statements.
 * @returns Map from locally declared name to its declaration metadata.
 * @example
 * ```typescript
 * const declarations = collectLocalDeclarationNames(program.body);
 * ```
 */
const collectLocalDeclarationNames = (
  body: AST.Program["body"],
): Map<string, LocalDeclaration> => {
  const declarationNames = new Map<string, LocalDeclaration>();

  for (const statement of body) {
    const declarationCandidate =
      statement.type === "ExportNamedDeclaration" &&
      statement.declaration !== null &&
      statement.declaration !== void 0
        ? statement.declaration
        : statement;
    const declarationCandidateRecord = asRecord(declarationCandidate);
    const declarationCandidateType = readStringProperty(
      declarationCandidate,
      "type",
    );

    if (
      declarationCandidateRecord === void 0 ||
      declarationCandidateType === void 0
    ) {
      continue;
    }

    if (
      declarationCandidateType === "FunctionDeclaration" ||
      declarationCandidateType === "ClassDeclaration" ||
      declarationCandidateType === "TSEnumDeclaration" ||
      declarationCandidateType === "TSInterfaceDeclaration" ||
      declarationCandidateType === "TSTypeAliasDeclaration"
    ) {
      const declarationName = readStringProperty(
        declarationCandidateRecord["id"],
        "name",
      );

      if (declarationName !== void 0) {
        declarationNames.set(declarationName, {
          kind:
            declarationCandidateType === "TSInterfaceDeclaration" ||
            declarationCandidateType === "TSTypeAliasDeclaration"
              ? "type"
              : "value",
          node: statement,
        });
      }

      continue;
    }

    if (declarationCandidateType !== "VariableDeclaration") {
      continue;
    }

    const declarations = readArrayProperty(
      declarationCandidateRecord,
      "declarations",
    );

    if (declarations === void 0) {
      continue;
    }

    for (const declaration of declarations) {
      const declarationRecord = asRecord(declaration);

      if (declarationRecord === void 0) {
        continue;
      }

      for (const name of collectPatternIdentifierNames(
        declarationRecord["id"],
      )) {
        declarationNames.set(name, { kind: "value", node: statement });
      }
    }
  }

  return declarationNames;
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
  const localDeclarationNames = collectLocalDeclarationNames(body);

  for (const statement of body) {
    if (statement.type === "ExportDefaultDeclaration") {
      exportedElements.push({
        exportedName: "default",
        exportKind: "value",
        node: statement,
      });
      continue;
    }

    if (statement.type !== "ExportNamedDeclaration") {
      continue;
    }

    if (statement.source !== null && statement.source !== void 0) {
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
            exportedElements.push({
              exportedName: name,
              exportKind: "value",
              node: statement,
            });
          }
        }
      } else {
        const declarationName = readStringProperty(declaration?.["id"], "name");
        const declarationType = readStringProperty(declaration, "type");
        const exportKind: ExportKind =
          declarationType === "TSInterfaceDeclaration" ||
          declarationType === "TSTypeAliasDeclaration"
            ? "type"
            : "value";

        if (typeof declarationName === "string") {
          exportedElements.push({
            exportedName: declarationName,
            exportKind,
            node: statement,
          });
        }
      }

      continue;
    }

    for (const specifier of statement.specifiers) {
      const localName = getExportSpecifierLocalName(specifier);
      const localDeclaration =
        localName === void 0 ? void 0 : localDeclarationNames.get(localName);

      if (localDeclaration === void 0) {
        continue;
      }

      const exportedName = getExportSpecifierName(specifier);

      if (exportedName !== void 0) {
        const statementExportKind = readStringProperty(statement, "exportKind");
        const specifierExportKind = readStringProperty(specifier, "exportKind");
        const isTypeOnlyExport =
          statementExportKind === "type" || specifierExportKind === "type";

        exportedElements.push({
          exportedName,
          exportKind: isTypeOnlyExport ? "type" : localDeclaration.kind,
          node: localDeclaration.node,
        });
      }
    }
  }

  return exportedElements;
};

/**
 * Resolves one symbol to its canonical target.
 * @param symbol Candidate symbol.
 * @param checker TypeScript checker.
 * @returns Resolved canonical symbol.
 * @example
 * ```typescript
 * const resolved = resolveCanonicalSymbol(symbol, checker);
 * ```
 */
const resolveCanonicalSymbol = (
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
): ts.Symbol => {
  if ((symbol.flags & ts.SymbolFlags.Alias) === 0) {
    return symbol;
  }

  try {
    return checker.getAliasedSymbol(symbol);
  } catch {
    return symbol;
  }
};

/**
 * Builds declaration-site keys for symbol identity matching.
 * @param symbol Symbol being compared.
 * @returns Declaration keys describing where this symbol is declared.
 * @example
 * ```typescript
 * const keys = getDeclarationKeys(symbol);
 * ```
 */
const getDeclarationKeys = (symbol: ts.Symbol): Set<string> => {
  const declarations = symbol.declarations ?? [];

  return new Set(
    declarations.map((declaration) => {
      const sourceFilename = declaration.getSourceFile().fileName;
      return `${sourceFilename}:${String(declaration.pos)}:${String(declaration.end)}`;
    }),
  );
};

/**
 * Checks whether two symbols reference the same declaration site.
 * @param left Left-hand symbol candidate.
 * @param right Right-hand symbol candidate.
 * @returns True when both symbols identify the same declaration.
 * @example
 * ```typescript
 * const same = isSameSymbol(left, right);
 * ```
 */
const isSameSymbol = (left: ts.Symbol, right: ts.Symbol): boolean => {
  if (left === right) {
    return true;
  }

  const leftKeys = getDeclarationKeys(left);
  const rightKeys = getDeclarationKeys(right);

  for (const key of leftKeys) {
    if (rightKeys.has(key)) {
      return true;
    }
  }

  return false;
};

/**
 * Resolves one exported symbol by name from a source file.
 * @param program TypeScript program.
 * @param sourceFilename Source file path.
 * @param exportedName Public name exposed by the module export list.
 * @returns Symbol when found.
 * @example
 * ```typescript
 * const symbol = getExportedSymbol(program, sourceFilename, "feature");
 * ```
 */
const getExportedSymbol = (
  program: ts.Program,
  sourceFilename: string,
  exportedName: string,
): ts.Symbol | undefined => {
  const checker = program.getTypeChecker();
  const sourceFile = program
    .getSourceFiles()
    .find(
      (file) =>
        toComparableAbsolutePath(file.fileName) ===
        toComparableAbsolutePath(sourceFilename),
    );

  if (sourceFile === void 0) {
    return void 0;
  }

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

  if (moduleSymbol === void 0) {
    return void 0;
  }

  const exportedSymbol = checker
    .getExportsOfModule(moduleSymbol)
    .find((symbol) => symbol.getName() === exportedName);

  if (exportedSymbol === void 0) {
    return void 0;
  }

  return resolveCanonicalSymbol(exportedSymbol, checker);
};

/**
 * Checks whether one source file exports the target symbol.
 * @param sourceFile Source file that may expose the symbol.
 * @param checker TypeScript checker.
 * @param targetSymbol Symbol being classified.
 * @returns True when one module export resolves to the target symbol.
 * @example
 * ```typescript
 * const exposed = sourceFileExportsSymbol(sourceFile, checker, targetSymbol);
 * ```
 */
const sourceFileExportsSymbol = (
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  targetSymbol: ts.Symbol,
): boolean => {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

  if (moduleSymbol === void 0) {
    return false;
  }

  for (const exportedSymbol of checker.getExportsOfModule(moduleSymbol)) {
    const resolvedSymbol = resolveCanonicalSymbol(exportedSymbol, checker);

    if (isSameSymbol(resolvedSymbol, targetSymbol)) {
      return true;
    }
  }

  return false;
};

/**
 * Checks whether an identifier participates in one declaration/import/export site.
 * @param identifier Identifier node to evaluate.
 * @returns True when the identifier is declaration-only syntax.
 * @example
 * ```typescript
 * const declaration = isDeclarationOnlyIdentifier(identifier);
 * ```
 */
const isDeclarationOnlyIdentifier = (identifier: ts.Identifier): boolean => {
  const parent = identifier.parent;

  return (
    ts.isImportSpecifier(parent) ||
    ts.isImportClause(parent) ||
    ts.isNamespaceImport(parent) ||
    ts.isImportEqualsDeclaration(parent) ||
    ts.isExportSpecifier(parent) ||
    ts.isTypeAliasDeclaration(parent) ||
    ts.isInterfaceDeclaration(parent) ||
    ts.isTypeParameterDeclaration(parent) ||
    (ts.isVariableDeclaration(parent) && parent.name === identifier) ||
    (ts.isFunctionDeclaration(parent) && parent.name === identifier) ||
    (ts.isClassDeclaration(parent) && parent.name === identifier) ||
    (ts.isParameter(parent) && parent.name === identifier)
  );
};

/**
 * Checks whether one identifier node appears under a type node.
 * @param identifier Candidate identifier.
 * @returns True when the identifier is inside type-only syntax.
 * @example
 * ```typescript
 * const typePosition = isTypePositionIdentifier(identifier);
 * ```
 */
const isTypePositionIdentifier = (identifier: ts.Identifier): boolean => {
  const visitNode = (current: ts.Node): boolean => {
    if (ts.isTypeQueryNode(current)) {
      return false;
    }

    if (ts.isTypeNode(current)) {
      return true;
    }

    if (
      ts.isExpressionStatement(current) ||
      ts.isCallExpression(current) ||
      ts.isPropertyAccessExpression(current) ||
      ts.isElementAccessExpression(current) ||
      ts.isVariableDeclaration(current) ||
      ts.isReturnStatement(current)
    ) {
      return false;
    }

    if (ts.isSourceFile(current)) {
      return false;
    }

    return visitNode(current.parent);
  };

  return visitNode(identifier);
};

/**
 * Checks whether one identifier is one concrete usage candidate for the export kind.
 * @param identifier Identifier node.
 * @param exportKind Whether type-only or value usage is required.
 * @returns True when the identifier can satisfy usage.
 * @example
 * ```typescript
 * const concrete = isConcreteUsageIdentifier(identifier, "value");
 * ```
 */
const isConcreteUsageIdentifier = (
  identifier: ts.Identifier,
  exportKind: ExportKind,
): boolean => {
  if (isDeclarationOnlyIdentifier(identifier)) {
    return false;
  }

  const inTypePosition = isTypePositionIdentifier(identifier);

  return exportKind === "type" ? inTypePosition : !inTypePosition;
};

/**
 * Appends concrete usages from one source file into the accumulator.
 * @param sourceFile Source file to scan.
 * @param checker TypeScript checker.
 * @param targetSymbol Export symbol being classified.
 * @param exportedElement Export metadata.
 * @param consumerIsTestFile Whether source file is a test file.
 * @param usages Mutable usage accumulator.
 * @example
 * ```typescript
 * collectConcreteUsagesFromSourceFile(sourceFile, checker, targetSymbolKey, exportedElement, false, usages);
 * ```
 */
const collectConcreteUsagesFromSourceFile = (
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  targetSymbol: ts.Symbol,
  exportedElement: ExportedElement,
  consumerIsTestFile: boolean,
  usages: ExportUsage[],
): void => {
  const visitNode = (node: ts.Node): void => {
    if (!ts.isIdentifier(node)) {
      ts.forEachChild(node, visitNode);
      return;
    }

    if (!isConcreteUsageIdentifier(node, exportedElement.exportKind)) {
      ts.forEachChild(node, visitNode);
      return;
    }

    const isShorthandName =
      ts.isShorthandPropertyAssignment(node.parent) &&
      node.parent.name === node;

    const candidateSymbol = isShorthandName
      ? checker.getShorthandAssignmentValueSymbol(node.parent)
      : checker.getSymbolAtLocation(node);

    if (candidateSymbol === void 0) {
      ts.forEachChild(node, visitNode);
      return;
    }

    const resolvedSymbol = resolveCanonicalSymbol(candidateSymbol, checker);

    if (!isSameSymbol(resolvedSymbol, targetSymbol)) {
      ts.forEachChild(node, visitNode);
      return;
    }

    usages.push({ isTestFile: consumerIsTestFile });
    ts.forEachChild(node, visitNode);
  };

  visitNode(sourceFile);
};

/**
 * Collects public API exposure usages for one exported symbol.
 * @param program TypeScript program.
 * @param sourceFilename Source filename where export is defined.
 * @param state Normalized rule options.
 * @param repoRoot Absolute repository root used for file classification.
 * @param targetSymbol Export symbol being classified.
 * @returns Public API exposure usages for the exported symbol.
 * @example
 * ```typescript
 * const usages = collectPublicApiExposureUsages(program, sourceFilename, state, repoRoot, targetSymbol);
 * ```
 */
const collectPublicApiExposureUsages = (
  program: ts.Program,
  sourceFilename: string,
  state: NoUnusedExportsState,
  repoRoot: string,
  targetSymbol: ts.Symbol,
): ExportUsage[] => {
  const checker = program.getTypeChecker();
  const normalizedSourceFilename = toComparableAbsolutePath(sourceFilename);
  const normalizedRepoRoot = path.resolve(repoRoot);
  const usages: ExportUsage[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    const publicApiFilename = path.resolve(sourceFile.fileName);
    const normalizedPublicApiFilename =
      toComparableAbsolutePath(publicApiFilename);

    if (normalizedPublicApiFilename === normalizedSourceFilename) {
      continue;
    }

    if (!isPublicApiFile(publicApiFilename, state, normalizedRepoRoot)) {
      continue;
    }

    if (!sourceFileExportsSymbol(sourceFile, checker, targetSymbol)) {
      continue;
    }

    usages.push({
      isTestFile: isTestFile(publicApiFilename, state, normalizedRepoRoot),
    });
  }

  return usages;
};

/**
 * Collects concrete usages of one exported element across the program.
 * @param program TypeScript program.
 * @param sourceFilename Source filename where export is defined.
 * @param state Normalized rule options.
 * @param repoRoot Absolute repository root used for test-file classification.
 * @param exportedElement Exported element to classify.
 * @returns Concrete usages for the exported element.
 * @example
 * ```typescript
 * const usages = collectCrossFileUsages(program, "/repo/src/feature.ts", state, "/repo", exportedElement);
 * ```
 */
const collectCrossFileUsages = (
  program: ts.Program,
  sourceFilename: string,
  state: NoUnusedExportsState,
  repoRoot: string,
  exportedElement: ExportedElement,
): ExportUsage[] => {
  const checker = program.getTypeChecker();
  const targetSymbol = getExportedSymbol(
    program,
    sourceFilename,
    exportedElement.exportedName,
  );

  if (targetSymbol === void 0) {
    return [];
  }

  const normalizedSourceFilename = toComparableAbsolutePath(sourceFilename);
  const normalizedRepoRoot = path.resolve(repoRoot);
  const usages: ExportUsage[] = collectPublicApiExposureUsages(
    program,
    sourceFilename,
    state,
    repoRoot,
    targetSymbol,
  );

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

    collectConcreteUsagesFromSourceFile(
      sourceFile,
      checker,
      targetSymbol,
      exportedElement,
      consumerIsTestFile,
      usages,
    );
  }

  return usages;
};

/**
 * Classifies one exported name based on cross-file usages.
 * @param usages Collected usages.
 * @returns Classification label.
 * @example
 * ```typescript
 * const classification = classifyExportUsage("feature", usages);
 * ```
 */
const classifyExportUsage = (
  usages: ExportUsage[],
): "production" | "test-only" | "unused" => {
  if (usages.length === 0) {
    return "unused";
  }

  for (const usage of usages) {
    if (!usage.isTestFile) {
      return "production";
    }
  }

  return "test-only";
};

export {
  classifyExportUsage,
  collectCrossFileUsages,
  collectExportedElements,
  getTypeScriptProgram,
};
