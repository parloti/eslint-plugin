import path from "node:path";
import * as ts from "typescript";

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

export {
  getExportedSymbol,
  isSameSymbol,
  resolveCanonicalSymbol,
  sourceFileExportsSymbol,
  toComparableAbsolutePath,
};
