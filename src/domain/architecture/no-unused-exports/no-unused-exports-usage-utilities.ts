import type * as ts from "typescript";

import path from "node:path";

import type {
  ExportedElement,
  ExportUsage,
  NoUnusedExportsState,
} from "./types";

import { resolveUsagePosition } from "./no-unused-exports-identifier-utilities";
import {
  getExportedSymbol,
  toComparableAbsolutePath,
} from "./no-unused-exports-symbol-utilities";
import {
  getIndexedSymbolUsages,
  getUsageFileClassifications,
} from "./no-unused-exports-usage-index";
import {
  PUBLIC_API_USAGE,
  TYPE_USAGE,
  VALUE_USAGE,
} from "./no-unused-exports-usage-index-builder";

/**
 * Collects cross-file usages from the shared Program index.
 * @param program TypeScript program.
 * @param sourceFilename Source filename where export is defined.
 * @param state Normalized rule options.
 * @param repoRoot Absolute repository root used for file classification.
 * @param exportedElement Exported element to classify.
 * @returns Concrete and public API usages for the exported element.
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
  const targetSymbol = getExportedSymbol(
    program,
    sourceFilename,
    exportedElement.exportedName,
  );

  if (targetSymbol === void 0) {
    return [];
  }

  const source = toComparableAbsolutePath(sourceFilename);
  const position = resolveUsagePosition(
    exportedElement.exportKind,
    targetSymbol,
  );
  const files = getUsageFileClassifications(
    program,
    state,
    path.resolve(repoRoot),
  );
  const publicApiUsages: ExportUsage[] = [];
  const concreteUsages: ExportUsage[] = [];

  for (const usage of getIndexedSymbolUsages(program, targetSymbol)) {
    if (usage.filename === source) {
      continue;
    }

    const classification = files.get(usage.filename);

    if (classification === void 0) {
      throw new Error(`Missing indexed source file: ${usage.filename}`);
    }

    if (
      (usage.positions & PUBLIC_API_USAGE) !== 0 &&
      classification.isPublicApiFile
    ) {
      publicApiUsages.push({ isTestFile: classification.isTestFile });
    }

    const usageMask =
      position === "any"
        ? TYPE_USAGE | VALUE_USAGE
        : position === "type"
          ? TYPE_USAGE
          : VALUE_USAGE;
    const hasConcreteUsage = (usage.positions & usageMask) !== 0;

    if (hasConcreteUsage) {
      concreteUsages.push({ isTestFile: classification.isTestFile });
    }
  }

  return [...publicApiUsages, ...concreteUsages];
};

/**
 * Classifies one exported name based on cross-file usages.
 * @param usages Collected usages.
 * @returns Classification label.
 * @example
 * ```typescript
 * const classification = classifyExportUsage(usages);
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
