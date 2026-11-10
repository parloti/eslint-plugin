import path from "node:path";
import * as ts from "typescript";

import type { NoUnusedExportsState } from "../no-unused-exports/types";
import type { SymbolIndex } from "./member-symbol-index-utilities";

import { isTestFile } from "../no-unused-exports/no-unused-exports-options";
import { addIndexedSymbol } from "./member-symbol-index-utilities";
import { getStringLiteralKeys } from "./member-usage-reference-utilities";

interface ProductionUsageIndex {
  boundaryCalls: ts.CallExpression[];
  computedMemberReads: Map<string, ts.ElementAccessExpression[]>;
  dynamicStringMemberReads: ts.ElementAccessExpression[];
  jsonStringifyCalls: ts.CallExpression[];
  localCalls: ts.CallExpression[];
  objectProperties: (ts.PropertyAssignment | ts.ShorthandPropertyAssignment)[];
  references: Map<string, ts.Node[]>;
  sourceFiles: ts.SourceFile[];
  spreads: ts.SpreadAssignment[];
  symbols: SymbolIndex;
}

const MEMBER_SYMBOL_FLAGS =
  ts.SymbolFlags.Property |
  ts.SymbolFlags.Method |
  ts.SymbolFlags.GetAccessor |
  ts.SymbolFlags.SetAccessor;

const productionUsageIndexes = new WeakMap<
  ts.Program,
  Map<string, ProductionUsageIndex>
>();

const getUsageSymbol = (
  node: ts.Node,
  checker: ts.TypeChecker,
): ts.Symbol | undefined => {
  const parent = node.parent;

  if (
    ts.isIdentifier(node) &&
    ts.isBindingElement(parent) &&
    parent.name === node &&
    parent.propertyName === void 0 &&
    ts.isObjectBindingPattern(parent.parent)
  ) {
    const owner = parent.parent.parent;
    const sourceType = ts.isVariableDeclaration(owner)
      ? owner.initializer === void 0
        ? void 0
        : checker.getTypeAtLocation(owner.initializer)
      : ts.isParameter(owner)
        ? checker.getTypeAtLocation(owner)
        : void 0;

    return sourceType === void 0
      ? checker.getSymbolAtLocation(node)
      : checker.getPropertyOfType(sourceType, node.text);
  }

  return checker.getSymbolAtLocation(node);
};

const isDeclarationName = (node: ts.Node): boolean => {
  const parent = node.parent;

  return (
    ((ts.isPropertyDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isShorthandPropertyAssignment(parent)) &&
      parent.name === node) ||
    (ts.isVariableDeclaration(parent) && parent.name === node) ||
    ((ts.isClassDeclaration(parent) ||
      ts.isInterfaceDeclaration(parent) ||
      ts.isTypeAliasDeclaration(parent) ||
      ts.isFunctionDeclaration(parent)) &&
      parent.name === node) ||
    (ts.isParameter(parent) && parent.name === node)
  );
};

const isStructuralPropertyName = (node: ts.Node): boolean => {
  const parent = node.parent;

  return (
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    (ts.isBindingElement(parent) &&
      (parent.name === node || parent.propertyName === node))
  );
};

const getProductionUsageIndex = (
  program: ts.Program,
  state: NoUnusedExportsState,
  repoRoot: string,
): ProductionUsageIndex => {
  const normalizedRoot = path.resolve(repoRoot);
  const cacheKey = JSON.stringify([normalizedRoot, state.testFilePatterns]);
  let indexes = productionUsageIndexes.get(program);
  const cached = indexes?.get(cacheKey);
  if (cached !== void 0) {
    return cached;
  }

  const checker = program.getTypeChecker();
  const index: ProductionUsageIndex = {
    boundaryCalls: [],
    computedMemberReads: new Map(),
    dynamicStringMemberReads: [],
    jsonStringifyCalls: [],
    localCalls: [],
    objectProperties: [],
    references: new Map(),
    sourceFiles: program
      .getSourceFiles()
      .filter(
        (file) =>
          !file.isDeclarationFile &&
          !isTestFile(path.resolve(file.fileName), state, normalizedRoot),
      ),
    spreads: [],
    symbols: new Set(),
  };
  const contextualObjectTypes = new WeakMap<
    ts.ObjectLiteralExpression,
    ts.Type | undefined
  >();
  const getContextualObjectType = (
    node: ts.ObjectLiteralExpression,
  ): ts.Type | undefined => {
    if (!contextualObjectTypes.has(node)) {
      contextualObjectTypes.set(node, checker.getContextualType(node));
    }

    return contextualObjectTypes.get(node);
  };
  const visit = (node: ts.Node): void => {
    if (
      (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) &&
      !isDeclarationName(node)
    ) {
      const symbol = getUsageSymbol(node, checker);
      if (symbol !== void 0 && (symbol.flags & MEMBER_SYMBOL_FLAGS) !== 0) {
        addIndexedSymbol(index.symbols, symbol);
      }

      if (isStructuralPropertyName(node)) {
        const references = index.references.get(node.text) ?? [];
        references.push(node);
        index.references.set(node.text, references);
      }
    }

    if (ts.isElementAccessExpression(node)) {
      const keyType = checker.getTypeAtLocation(node.argumentExpression);
      const keys = getStringLiteralKeys(keyType);

      const uniqueKeys = new Set(keys);

      for (const key of uniqueKeys) {
        const reads = index.computedMemberReads.get(key) ?? [];
        reads.push(node);
        index.computedMemberReads.set(key, reads);
      }

      if (keys.length === 0 && (keyType.flags & ts.TypeFlags.String) !== 0) {
        index.dynamicStringMemberReads.push(node);
      }
    } else if (ts.isSpreadAssignment(node)) {
      index.spreads.push(node);
    } else if (ts.isCallExpression(node)) {
      if (node.arguments.length > 0) {
        const isJsonStringifyCandidate =
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === "stringify";

        if (isJsonStringifyCandidate) {
          index.jsonStringifyCalls.push(node);
        }

        const declaration = checker
          .getResolvedSignature(node)
          ?.getDeclaration();
        const hasImplementation =
          declaration !== void 0 &&
          "body" in declaration &&
          declaration.body !== void 0;

        if (hasImplementation) {
          index.localCalls.push(node);
        } else if (!isJsonStringifyCandidate && declaration !== void 0) {
          index.boundaryCalls.push(node);
        }
      }
    } else if (
      (ts.isPropertyAssignment(node) ||
        ts.isShorthandPropertyAssignment(node)) &&
      ts.isObjectLiteralExpression(node.parent) &&
      getContextualObjectType(node.parent) !== void 0
    ) {
      index.objectProperties.push(node);
    }
    ts.forEachChild(node, visit);
  };
  for (const sourceFile of index.sourceFiles) {
    visit(sourceFile);
  }

  if (indexes === void 0) {
    indexes = new Map();
    productionUsageIndexes.set(program, indexes);
  }
  indexes.set(cacheKey, index);
  return index;
};

export { getProductionUsageIndex };
