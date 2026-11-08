import path from "node:path";
import * as ts from "typescript";

import type { NoUnusedExportsState } from "../no-unused-exports/types";
import type { SymbolIndex } from "./member-symbol-index-utilities";

import { isTestFile } from "../no-unused-exports/no-unused-exports-options";
import { addIndexedSymbol } from "./member-symbol-index-utilities";

interface ProductionUsageIndex {
  operations: ts.Node[];
  references: Map<string, ts.Node[]>;
  sourceFiles: ts.SourceFile[];
  symbols: SymbolIndex;
}

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
    operations: [],
    references: new Map(),
    sourceFiles: program
      .getSourceFiles()
      .filter(
        (file) =>
          !file.isDeclarationFile &&
          !isTestFile(path.resolve(file.fileName), state, normalizedRoot),
      ),
    symbols: new Set(),
  };
  const visit = (node: ts.Node): void => {
    if (
      (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) &&
      !isDeclarationName(node)
    ) {
      const symbol = getUsageSymbol(node, checker);
      if (symbol !== void 0) {
        addIndexedSymbol(index.symbols, symbol);
      }
      const references = index.references.get(node.text) ?? [];
      references.push(node);
      index.references.set(node.text, references);
    }

    if (
      ts.isElementAccessExpression(node) ||
      ts.isSpreadAssignment(node) ||
      ts.isCallExpression(node) ||
      ts.isPropertyAssignment(node) ||
      ts.isShorthandPropertyAssignment(node)
    ) {
      index.operations.push(node);
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
