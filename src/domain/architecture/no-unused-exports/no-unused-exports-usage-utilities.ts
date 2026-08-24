import path from "node:path";
import * as ts from "typescript";

import type {
  ExportedElement,
  ExportUsage,
  NoUnusedExportsState,
} from "./types";

import { isConcreteUsageIdentifier } from "./no-unused-exports-identifier-utilities";
import { isTestFile } from "./no-unused-exports-options";
import { collectPublicApiExposureUsages } from "./no-unused-exports-public-api-usage-utilities";
import {
  getExportedSymbol,
  isSameSymbol,
  resolveCanonicalSymbol,
  toComparableAbsolutePath,
} from "./no-unused-exports-symbol-utilities";

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

    const isConsumerTestFile = isTestFile(
      consumerFilename,
      state,
      normalizedRepoRoot,
    );

    collectConcreteUsagesFromSourceFile(
      sourceFile,
      checker,
      targetSymbol,
      exportedElement,
      isConsumerTestFile,
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

export { classifyExportUsage, collectCrossFileUsages };
