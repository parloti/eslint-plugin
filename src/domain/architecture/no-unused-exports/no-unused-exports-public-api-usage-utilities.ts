import path from "node:path";
import * as ts from "typescript";

import type { ExportUsage, NoUnusedExportsState } from "./types";

import { isPublicApiFile, isTestFile } from "./no-unused-exports-options";
import {
  sourceFileExportsSymbol,
  toComparableAbsolutePath,
} from "./no-unused-exports-symbol-utilities";

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

export { collectPublicApiExposureUsages };
