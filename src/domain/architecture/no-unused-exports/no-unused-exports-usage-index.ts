import * as ts from "typescript";

import type { NoUnusedExportsState } from "./types";

import { isPublicApiFile, isTestFile } from "./no-unused-exports-options";
import { getDeclarationKeys } from "./no-unused-exports-symbol-utilities";
import {
  getProgramUsageIndex,
  type UsageFileClassification,
} from "./no-unused-exports-usage-index-builder";

/** Usage positions collected for one source file. */
interface IndexedUsage {
  filename: string;
  positions: number;
}

/**
 * Looks up files containing references without revisiting AST nodes or
 * resolving identifiers.
 * @param program TypeScript Program snapshot.
 * @param symbol Canonical exported symbol.
 * @returns Per-file usage positions, including declaration-equivalent symbols.
 * @example
 * ```typescript
 * const usages = getIndexedSymbolUsages(program, symbol);
 * ```
 */
const getIndexedSymbolUsages = (
  program: ts.Program,
  symbol: ts.Symbol,
): IndexedUsage[] => {
  const index = getProgramUsageIndex(program);
  const keys = index.symbolKeys.get(symbol) ?? [
    symbol,
    ...getDeclarationKeys(symbol),
  ];
  const usages = new Map<string, number>();

  for (const key of keys) {
    const indexedUsages = index.usages.get(key);

    if (indexedUsages === void 0) {
      continue;
    }

    for (const [filename, positions] of indexedUsages) {
      usages.set(filename, (usages.get(filename) ?? 0) | positions);
    }
  }

  return [...usages].map(([filename, positions]) => ({ filename, positions }));
};

/**
 * Caches glob matching separately for each root and normalized option set.
 * @param program TypeScript Program snapshot.
 * @param state Normalized rule options.
 * @param repoRoot Absolute root used for glob matching.
 * @returns Classifications keyed by comparable source filename.
 * @example
 * ```typescript
 * const files = getUsageFileClassifications(program, state, repoRoot);
 * ```
 */
const getUsageFileClassifications = (
  program: ts.Program,
  state: NoUnusedExportsState,
  repoRoot: string,
): ReadonlyMap<string, UsageFileClassification> => {
  const index = getProgramUsageIndex(program);
  const key = JSON.stringify([
    repoRoot,
    state.publicApiFiles,
    state.testFilePatterns,
  ]);
  let classifications = index.classifications.get(key);

  if (classifications === void 0) {
    classifications = new Map();

    for (const [filename, originalFilename] of index.filenames) {
      classifications.set(filename, {
        isPublicApiFile: isPublicApiFile(originalFilename, state, repoRoot),
        isTestFile: isTestFile(originalFilename, state, repoRoot),
      });
    }

    index.classifications.set(key, classifications);
  }

  return classifications;
};

export { getIndexedSymbolUsages, getUsageFileClassifications };
