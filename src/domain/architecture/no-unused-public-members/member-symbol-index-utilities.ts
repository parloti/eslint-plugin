import type * as ts from "typescript";

import { getDeclarationKeys } from "../no-unused-exports/no-unused-exports-symbol-utilities";

type SymbolIndex = Set<string | ts.Symbol>;

const addIndexedSymbol = (index: SymbolIndex, symbol: ts.Symbol): void => {
  index.add(symbol);
  for (const key of getDeclarationKeys(symbol)) {
    index.add(key);
  }
};

const hasIndexedSymbol = (index: SymbolIndex, symbol: ts.Symbol): boolean =>
  index.has(symbol) || !index.isDisjointFrom(getDeclarationKeys(symbol));

export { addIndexedSymbol, hasIndexedSymbol };
export type { SymbolIndex };
