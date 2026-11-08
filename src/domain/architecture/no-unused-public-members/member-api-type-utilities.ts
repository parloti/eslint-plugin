import * as ts from "typescript";

import type { SymbolIndex } from "./member-symbol-index-utilities";

import {
  isSameSymbol,
  resolveCanonicalSymbol,
} from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { addIndexedSymbol } from "./member-symbol-index-utilities";

const collectTypeSymbols = (
  type: ts.Type,
  symbols: SymbolIndex,
  targetSymbol: ts.Symbol,
  checker: ts.TypeChecker,
  location: ts.Node,
  visitedTypes: Set<ts.Type>,
  depth: number,
): boolean => {
  if (depth < 0 || visitedTypes.has(type)) {
    return false;
  }

  visitedTypes.add(type);

  if (type.isUnionOrIntersection()) {
    return type.types.some((constituent) =>
      collectTypeSymbols(
        constituent,
        symbols,
        targetSymbol,
        checker,
        location,
        visitedTypes,
        depth,
      ),
    );
  }

  for (const property of checker.getPropertiesOfType(type)) {
    const canonical = resolveCanonicalSymbol(property, checker);
    addIndexedSymbol(symbols, canonical);
    if (
      isSameSymbol(canonical, targetSymbol) ||
      collectTypeSymbols(
        checker.getTypeOfSymbolAtLocation(property, location),
        symbols,
        targetSymbol,
        checker,
        location,
        visitedTypes,
        depth - 1,
      )
    ) {
      return true;
    }
  }

  const indexTypes = [
    checker.getIndexTypeOfType(type, ts.IndexKind.Number),
    checker.getIndexTypeOfType(type, ts.IndexKind.String),
  ];
  for (const indexType of indexTypes) {
    if (
      indexType !== void 0 &&
      collectTypeSymbols(
        indexType,
        symbols,
        targetSymbol,
        checker,
        location,
        visitedTypes,
        depth - 1,
      )
    ) {
      return true;
    }
  }

  const signatures = [
    ...checker.getSignaturesOfType(type, ts.SignatureKind.Call),
    ...checker.getSignaturesOfType(type, ts.SignatureKind.Construct),
  ];
  for (const signature of signatures) {
    const signatureTypes = [
      checker.getReturnTypeOfSignature(signature),
      ...signature
        .getParameters()
        .map((parameter) =>
          checker.getTypeOfSymbolAtLocation(parameter, location),
        ),
    ];
    for (const signatureType of signatureTypes) {
      if (
        collectTypeSymbols(
          signatureType,
          symbols,
          targetSymbol,
          checker,
          location,
          visitedTypes,
          depth - 1,
        )
      ) {
        return true;
      }
    }
  }
  return false;
};

export { collectTypeSymbols };
