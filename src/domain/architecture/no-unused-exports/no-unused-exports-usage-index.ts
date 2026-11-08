import path from "node:path";
import * as ts from "typescript";

import type { NoUnusedExportsState } from "./types";

import { isConcreteUsageIdentifier } from "./no-unused-exports-identifier-utilities";
import { isPublicApiFile, isTestFile } from "./no-unused-exports-options";
import {
  getDeclarationKeys,
  resolveCanonicalSymbol,
  toComparableAbsolutePath,
} from "./no-unused-exports-symbol-utilities";

/** One option-independent reference or module export. */
interface IndexedUsage {
  filename: string;
  position: "public-api" | "type" | "value";
}

/** Data owned by a single immutable TypeScript Program snapshot. */
interface ProgramUsageIndex {
  classifications: Map<string, Map<string, UsageFileClassification>>;
  filenames: Map<string, string>;
  symbolKeys: Map<ts.Symbol, (string | ts.Symbol)[]>;
  usages: Map<string | ts.Symbol, IndexedUsage[]>;
}

/** Option-dependent classification of one indexed source file. */
interface UsageFileClassification {
  isPublicApiFile: boolean;
  isTestFile: boolean;
}

const programUsageIndexes = new WeakMap<ts.Program, ProgramUsageIndex>();

/**
 * Adds a reference under both canonical identity and declaration-site identities.
 * @param index Program index being built.
 * @param symbol Canonical symbol.
 * @param usage Reference metadata.
 * @example
 * ```typescript
 * indexSymbolUsage(index, symbol, { filename, position: "value" });
 * ```
 */
const indexSymbolUsage = (
  index: ProgramUsageIndex,
  symbol: ts.Symbol,
  usage: IndexedUsage,
): void => {
  let keys = index.symbolKeys.get(symbol);

  if (keys === void 0) {
    keys = [symbol, ...getDeclarationKeys(symbol)];
    index.symbolKeys.set(symbol, keys);
  }

  for (const key of keys) {
    const usages = index.usages.get(key);

    if (usages === void 0) {
      index.usages.set(key, [usage]);
    } else {
      usages.push(usage);
    }
  }
};

/**
 * Scans a Program once, independently of per-file ESLint options.
 * @param program TypeScript Program snapshot.
 * @returns Symbol usage index for the snapshot.
 * @example
 * ```typescript
 * const index = buildProgramUsageIndex(program);
 * ```
 */
const buildProgramUsageIndex = (program: ts.Program): ProgramUsageIndex => {
  const index: ProgramUsageIndex = {
    classifications: new Map(),
    filenames: new Map(),
    symbolKeys: new Map(),
    usages: new Map(),
  };
  const checker = program.getTypeChecker();
  const canonicalSymbols = new Map<ts.Symbol, ts.Symbol>();
  const canonicalize = (symbol: ts.Symbol): ts.Symbol => {
    let canonical = canonicalSymbols.get(symbol);

    if (canonical === void 0) {
      canonical = resolveCanonicalSymbol(symbol, checker);
      canonicalSymbols.set(symbol, canonical);
    }

    return canonical;
  };

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    const filename = toComparableAbsolutePath(sourceFile.fileName);
    index.filenames.set(filename, path.resolve(sourceFile.fileName));
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

    if (moduleSymbol !== void 0) {
      const exposure: IndexedUsage = { filename, position: "public-api" };

      for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
        indexSymbolUsage(index, canonicalize(symbol), exposure);
      }
    }

    const visitNode = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && isConcreteUsageIdentifier(node, "any")) {
        const symbol =
          ts.isShorthandPropertyAssignment(node.parent) &&
          node.parent.name === node
            ? checker.getShorthandAssignmentValueSymbol(node.parent)
            : checker.getSymbolAtLocation(node);

        if (symbol !== void 0) {
          indexSymbolUsage(index, canonicalize(symbol), {
            filename,
            position: isConcreteUsageIdentifier(node, "type")
              ? "type"
              : "value",
          });
        }
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
  }

  return index;
};

/**
 * Reuses analysis only while the parser retains the same Program.
 * @param program TypeScript Program snapshot.
 * @returns Cached or freshly built index.
 * @example
 * ```typescript
 * const index = getProgramUsageIndex(program);
 * ```
 */
const getProgramUsageIndex = (program: ts.Program): ProgramUsageIndex => {
  let index = programUsageIndexes.get(program);

  if (index === void 0) {
    index = buildProgramUsageIndex(program);
    programUsageIndexes.set(program, index);
  }

  return index;
};

/**
 * Looks up references without revisiting AST nodes or resolving identifiers.
 * @param program TypeScript Program snapshot.
 * @param symbol Canonical exported symbol.
 * @returns Unique references, including declaration-equivalent symbols.
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
  const usages = new Set<IndexedUsage>();

  for (const key of keys) {
    const indexedUsages = index.usages.get(key) ?? [];

    for (const usage of indexedUsages) {
      usages.add(usage);
    }
  }

  return [...usages];
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
