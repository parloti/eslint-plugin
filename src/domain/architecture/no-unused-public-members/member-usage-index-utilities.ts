import path from "node:path";
import * as ts from "typescript";

import type { NoUnusedExportsState } from "../no-unused-exports/types";
import type { MemberAnalysisScope } from "./member-scope-utilities";
import type { SymbolIndex } from "./member-symbol-index-utilities";

import {
  isProjectSourceFile,
  isTestFile,
} from "../no-unused-exports/no-unused-exports-options";
import { getSourceFileFacts } from "../program-analysis";
import { buildMemberConsumerIndex } from "./member-consumer-utilities";
import {
  getMemberProgramCache,
  setMemberProgramCache,
} from "./member-program-cache-utilities";
import { addIndexedSymbol } from "./member-symbol-index-utilities";
import { getReferencedMemberSymbol } from "./member-usage-reference-utilities";

interface ProductionUsageCache {
  scopes: WeakMap<MemberAnalysisScope, ProductionUsageIndex>;
  unscoped?: ProductionUsageIndex;
}

interface ProductionUsageIndex {
  deferredReferences: Map<string, ts.Node[]>;
  operations: readonly ts.Node[];
  references: Map<string, ts.Node[]>;
  sourceFiles: ts.SourceFile[];
  symbols: SymbolIndex;
}

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
  scope?: MemberAnalysisScope,
): ProductionUsageIndex => {
  const normalizedRoot = path.resolve(repoRoot);
  const cacheName = "production-usage-index";
  const cacheKey = JSON.stringify([normalizedRoot, state.testFilePatterns]);
  const cache: ProductionUsageCache = (getMemberProgramCache(
    program,
    cacheName,
    cacheKey,
  ) as ProductionUsageCache | undefined) ?? { scopes: new WeakMap() };
  const cached = scope === void 0 ? cache.unscoped : cache.scopes.get(scope);
  if (cached !== void 0) {
    return cached;
  }

  const checker = program.getTypeChecker();
  const index: ProductionUsageIndex = {
    deferredReferences: new Map(),
    operations: [],
    references: new Map(),
    sourceFiles:
      scope === void 0
        ? program
            .getSourceFiles()
            .filter(
              (file) =>
                !file.isDeclarationFile &&
                isProjectSourceFile(file.fileName, normalizedRoot) &&
                !isTestFile(path.resolve(file.fileName), state, normalizedRoot),
            )
        : [...scope.sourceFiles],
    symbols: new Set(),
  };
  const consumers = buildMemberConsumerIndex(program, index.sourceFiles);
  const pendingReferences = new Map<
    string,
    (ts.Identifier | ts.StringLiteralLike)[]
  >();
  const sourceFacts = index.sourceFiles.map((file) => getSourceFileFacts(file));
  for (const facts of sourceFacts) {
    for (const node of facts.references) {
      if (
        !(ts.isIdentifier(node) || ts.isStringLiteralLike(node)) ||
        !consumers.memberNames.has(node.text) ||
        isDeclarationName(node)
      ) {
        continue;
      }
      const references = pendingReferences.get(node.text) ?? [];
      references.push(node);
      pendingReferences.set(node.text, references);
    }
  }

  const indexReference = (
    node: ts.Identifier | ts.StringLiteralLike,
    sourceFiles: ReadonlySet<ts.SourceFile>,
  ): void => {
    if (sourceFiles.has(node.getSourceFile())) {
      const symbol = getReferencedMemberSymbol(node, checker, program);
      if (symbol !== void 0) {
        addIndexedSymbol(index.symbols, symbol);
      }
    } else {
      const deferred = index.deferredReferences.get(node.text) ?? [];
      deferred.push(node);
      index.deferredReferences.set(node.text, deferred);
    }

    if (!isStructuralPropertyName(node)) {
      return;
    }
    const references = index.references.get(node.text) ?? [];
    references.push(node);
    index.references.set(node.text, references);
  };
  for (const [name, references] of pendingReferences) {
    const sourceFiles = consumers.getConsumers(name);
    for (const reference of references) {
      indexReference(reference, sourceFiles);
    }
  }
  index.operations = sourceFacts.flatMap((facts) => facts.operations);

  if (scope === void 0) {
    cache.unscoped = index;
  } else {
    cache.scopes.set(scope, index);
  }
  setMemberProgramCache(program, cacheName, cacheKey, cache);
  return index;
};

export { getProductionUsageIndex };
