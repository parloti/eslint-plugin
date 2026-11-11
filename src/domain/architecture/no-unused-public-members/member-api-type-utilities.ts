import * as ts from "typescript";

import type { SymbolIndex } from "./member-symbol-index-utilities";

import { resolveCanonicalSymbol } from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { addIndexedSymbol } from "./member-symbol-index-utilities";

const collectTypeSymbols = (
  type: ts.Type,
  symbols: SymbolIndex,
  checker: ts.TypeChecker,
  location: ts.Node,
  visitedTypes: Set<ts.Type>,
  depth: number,
): void => {
  if (depth < 0 || visitedTypes.has(type)) {
    return;
  }

  visitedTypes.add(type);

  if (type.isUnionOrIntersection()) {
    for (const constituent of type.types) {
      collectTypeSymbols(
        constituent,
        symbols,
        checker,
        location,
        visitedTypes,
        depth,
      );
    }

    return;
  }

  for (const property of checker.getPropertiesOfType(type)) {
    const canonical = resolveCanonicalSymbol(property, checker);
    addIndexedSymbol(symbols, canonical);
    collectTypeSymbols(
      checker.getTypeOfSymbolAtLocation(property, location),
      symbols,
      checker,
      location,
      visitedTypes,
      depth - 1,
    );
  }

  const indexTypes = [
    checker.getIndexTypeOfType(type, ts.IndexKind.Number),
    checker.getIndexTypeOfType(type, ts.IndexKind.String),
  ];
  for (const indexType of indexTypes) {
    if (indexType !== void 0) {
      collectTypeSymbols(
        indexType,
        symbols,
        checker,
        location,
        visitedTypes,
        depth - 1,
      );
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
      collectTypeSymbols(
        signatureType,
        symbols,
        checker,
        location,
        visitedTypes,
        depth - 1,
      );
    }
  }
};

export { collectTypeSymbols };
