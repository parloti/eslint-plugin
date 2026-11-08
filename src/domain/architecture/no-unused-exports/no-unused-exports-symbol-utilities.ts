import path from "node:path";
import * as ts from "typescript";

const declarationKeyCache = new WeakMap<ts.Symbol, Set<string>>();

const programExportCaches = new WeakMap<
  ts.Program,
  {
    exports: Map<string, Map<string, ts.Symbol>>;
    files: Map<string, ts.SourceFile>;
  }
>();

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
  const cached = declarationKeyCache.get(symbol);
  if (cached !== void 0) {
    return cached;
  }

  const declarations = symbol.declarations ?? [];

  const keys = new Set(
    declarations.map((declaration) => {
      const sourceFilename = declaration.getSourceFile().fileName;
      return `${sourceFilename}:${String(declaration.pos)}:${String(declaration.end)}`;
    }),
  );
  declarationKeyCache.set(symbol, keys);
  return keys;
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
  let cache = programExportCaches.get(program);

  if (cache === void 0) {
    cache = {
      exports: new Map(),
      files: new Map(
        program
          .getSourceFiles()
          .map((file) => [toComparableAbsolutePath(file.fileName), file]),
      ),
    };
    programExportCaches.set(program, cache);
  }

  const filename = toComparableAbsolutePath(sourceFilename);
  const cachedExports = cache.exports.get(filename);

  if (cachedExports !== void 0) {
    return cachedExports.get(exportedName);
  }

  const sourceFile = cache.files.get(filename);

  if (sourceFile === void 0) {
    return void 0;
  }

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  const exports = new Map(
    (moduleSymbol === void 0
      ? []
      : checker.getExportsOfModule(moduleSymbol)
    ).map((symbol) => [
      symbol.getName(),
      resolveCanonicalSymbol(symbol, checker),
    ]),
  );
  cache.exports.set(filename, exports);

  return exports.get(exportedName);
};

export {
  getDeclarationKeys,
  getExportedSymbol,
  isSameSymbol,
  resolveCanonicalSymbol,
  toComparableAbsolutePath,
};
