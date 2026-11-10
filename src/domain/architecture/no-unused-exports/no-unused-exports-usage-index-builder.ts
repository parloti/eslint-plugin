import path from "node:path";
import * as ts from "typescript";

import { getConcreteUsagePosition } from "./no-unused-exports-identifier-utilities";
import { isLintableFilename } from "./no-unused-exports-options";
import {
  getDeclarationKeys,
  resolveCanonicalSymbol,
  toComparableAbsolutePath,
} from "./no-unused-exports-symbol-utilities";

/** Position flags used to aggregate equivalent usages in one source file. */
const PUBLIC_API_USAGE = 1;
const TYPE_USAGE = 2;
const VALUE_USAGE = 4;

/** Option-dependent classification of one indexed source file. */
export interface UsageFileClassification {
  isPublicApiFile: boolean;
  isTestFile: boolean;
}

/** Data owned by a single immutable TypeScript Program snapshot. */
interface ProgramUsageIndex {
  classifications: Map<string, Map<string, UsageFileClassification>>;
  filenames: Map<string, string>;
  symbolKeys: Map<ts.Symbol, (string | ts.Symbol)[]>;
  usages: Map<string | ts.Symbol, Map<string, number>>;
}

const programUsageIndexes = new WeakMap<ts.Program, ProgramUsageIndex>();

/**
 * Adds a reference under both canonical identity and declaration-site identities.
 * @param index Program index being built.
 * @param symbol Canonical symbol.
 * @param filename Comparable source filename containing the usage.
 * @param position Usage position recorded for this file.
 * @example
 * ```typescript
 * indexSymbolUsage(index, symbol, filename, "value");
 * ```
 */
const indexSymbolUsage = (
  index: ProgramUsageIndex,
  symbol: ts.Symbol,
  filename: string,
  position: "public-api" | "type" | "value",
): void => {
  let keys = index.symbolKeys.get(symbol);

  if (keys === void 0) {
    keys = [symbol, ...getDeclarationKeys(symbol)];
    index.symbolKeys.set(symbol, keys);
  }

  const positionFlag =
    position === "public-api"
      ? PUBLIC_API_USAGE
      : position === "type"
        ? TYPE_USAGE
        : VALUE_USAGE;

  for (const key of keys) {
    let usages = index.usages.get(key);

    if (usages === void 0) {
      usages = new Map();
      index.usages.set(key, usages);
    }

    usages.set(filename, (usages.get(filename) ?? 0) | positionFlag);
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
  const canonicalSymbols = new WeakMap<ts.Symbol, ts.Symbol>();
  const exportedSymbolKeys = new Set<string | ts.Symbol>();
  const exportedSymbolCache = new WeakMap<ts.Symbol, boolean>();
  const possibleUsageNames = new Set<string>();
  const canonicalize = (symbol: ts.Symbol): ts.Symbol => {
    let canonical = canonicalSymbols.get(symbol);

    if (canonical === void 0) {
      canonical = resolveCanonicalSymbol(symbol, checker);
      canonicalSymbols.set(symbol, canonical);
    }

    return canonical;
  };
  const isExportedSymbol = (symbol: ts.Symbol): boolean => {
    const cached = exportedSymbolCache.get(symbol);

    if (cached !== void 0) {
      return cached;
    }

    let isExported = exportedSymbolKeys.has(symbol);

    if (!isExported) {
      for (const declarationKey of getDeclarationKeys(symbol)) {
        if (exportedSymbolKeys.has(declarationKey)) {
          isExported = true;
          break;
        }
      }
    }

    exportedSymbolCache.set(symbol, isExported);
    return isExported;
  };

  const sourceFiles = program.getSourceFiles();

  for (const sourceFile of sourceFiles) {
    const isDeclarationFile = sourceFile.isDeclarationFile;

    if (
      isDeclarationFile &&
      !isLintableFilename(path.resolve(sourceFile.fileName))
    ) {
      continue;
    }

    const filename = toComparableAbsolutePath(sourceFile.fileName);

    if (!isDeclarationFile) {
      index.filenames.set(filename, path.resolve(sourceFile.fileName));
    }

    if (!isDeclarationFile) {
      for (const statement of sourceFile.statements) {
        if (ts.isImportDeclaration(statement)) {
          const importClause = statement.importClause;
          if (importClause === void 0) {
            continue;
          }

          if (importClause.name !== void 0) {
            possibleUsageNames.add(importClause.name.text);
          }

          const bindings = importClause.namedBindings;
          if (bindings === void 0) {
            continue;
          }

          if (ts.isNamespaceImport(bindings)) {
            possibleUsageNames.add(bindings.name.text);
          } else {
            for (const specifier of bindings.elements) {
              possibleUsageNames.add(specifier.name.text);
            }
          }
        } else if (ts.isImportEqualsDeclaration(statement)) {
          possibleUsageNames.add(statement.name.text);
        }
      }
    }

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

    if (moduleSymbol !== void 0) {
      for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
        const canonicalSymbol = canonicalize(symbol);

        if (!isDeclarationFile) {
          indexSymbolUsage(index, canonicalSymbol, filename, "public-api");
        }

        possibleUsageNames.add(symbol.getName());
        possibleUsageNames.add(canonicalSymbol.getName());
        exportedSymbolKeys.add(canonicalSymbol);

        for (const declarationKey of getDeclarationKeys(canonicalSymbol)) {
          exportedSymbolKeys.add(declarationKey);
        }
      }
    }
  }

  for (const sourceFile of sourceFiles) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    const filename = toComparableAbsolutePath(sourceFile.fileName);

    const visitNode = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && possibleUsageNames.has(node.text)) {
        const position = getConcreteUsagePosition(node);

        if (position !== void 0) {
          const symbol =
            ts.isShorthandPropertyAssignment(node.parent) &&
            node.parent.name === node
              ? checker.getShorthandAssignmentValueSymbol(node.parent)
              : checker.getSymbolAtLocation(node);

          if (symbol !== void 0) {
            const canonicalSymbol = canonicalize(symbol);

            if (isExportedSymbol(canonicalSymbol)) {
              indexSymbolUsage(index, canonicalSymbol, filename, position);
            }
          }
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

export { getProgramUsageIndex, PUBLIC_API_USAGE, TYPE_USAGE, VALUE_USAGE };
