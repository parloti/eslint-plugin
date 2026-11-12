import * as ts from "typescript";

interface SourceFileFacts {
  moduleSpecifiers: readonly ts.StringLiteralLike[];
  operations: readonly ts.Node[];
  references: readonly (
    ts.Identifier | ts.NumericLiteral | ts.StringLiteralLike
  )[];
}

const sourceFileFacts = new WeakMap<ts.SourceFile, SourceFileFacts>();
const referenceSymbols = new WeakMap<
  ts.Program,
  WeakMap<ts.Node, ts.Symbol | undefined>
>();

const isModuleSpecifier = (node: ts.StringLiteralLike): boolean => {
  const parent = node.parent;
  return (
    (ts.isImportDeclaration(parent) && parent.moduleSpecifier === node) ||
    (ts.isExportDeclaration(parent) && parent.moduleSpecifier === node) ||
    (ts.isExternalModuleReference(parent) && parent.expression === node) ||
    (ts.isLiteralTypeNode(parent) &&
      ts.isImportTypeNode(parent.parent) &&
      parent.parent.argument === parent) ||
    (ts.isCallExpression(parent) &&
      parent.arguments[0] === node &&
      (parent.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(parent.expression) &&
          parent.expression.text === "require")))
  );
};

/**
 * Collects reusable syntax facts without classifying files or resolving types.
 * @param sourceFile Immutable TypeScript source snapshot.
 * @returns Reference names, module specifiers, and candidate operations.
 * @example
 * ```typescript
 * const facts = getSourceFileFacts(sourceFile);
 * ```
 */
const getSourceFileFacts = (sourceFile: ts.SourceFile): SourceFileFacts => {
  const cached = sourceFileFacts.get(sourceFile);
  if (cached !== void 0) {
    return cached;
  }
  const references: (
    ts.Identifier | ts.NumericLiteral | ts.StringLiteralLike
  )[] = [];
  const moduleSpecifiers: ts.StringLiteralLike[] = [];
  const operations: ts.Node[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isIdentifier(node) ||
      ts.isStringLiteralLike(node) ||
      ts.isNumericLiteral(node)
    ) {
      references.push(node);
      if (ts.isStringLiteralLike(node) && isModuleSpecifier(node)) {
        moduleSpecifiers.push(node);
      }
    } else if (
      ts.isElementAccessExpression(node) ||
      ts.isSpreadAssignment(node) ||
      ts.isCallExpression(node) ||
      ts.isPropertyAssignment(node) ||
      ts.isShorthandPropertyAssignment(node)
    ) {
      operations.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  const facts = { moduleSpecifiers, operations, references };
  sourceFileFacts.set(sourceFile, facts);
  return facts;
};

/**
 * Shares native symbol lookups, including absent symbols, within one Program.
 * @param program TypeScript semantic snapshot.
 * @param node Reference or module node to resolve.
 * @returns Native symbol without rule-specific alias or destructuring handling.
 * @example
 * ```typescript
 * const symbol = getSourceReferenceSymbol(program, identifier);
 * ```
 */
const getSourceReferenceSymbol = (
  program: ts.Program,
  node: ts.Node,
): ts.Symbol | undefined => {
  let symbols = referenceSymbols.get(program);
  if (symbols === void 0) {
    symbols = new WeakMap();
    referenceSymbols.set(program, symbols);
  }
  if (!symbols.has(node)) {
    symbols.set(node, program.getTypeChecker().getSymbolAtLocation(node));
  }
  return symbols.get(node);
};

export { getSourceFileFacts, getSourceReferenceSymbol };
