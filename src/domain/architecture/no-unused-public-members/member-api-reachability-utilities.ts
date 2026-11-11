import * as ts from "typescript";

import {
  getMemberProgramCache,
  setMemberProgramCache,
} from "./member-program-cache-utilities";

const MAX_CACHED_REACHABILITY_ROOTS = 16;

interface SourceReachability {
  dependencies: WeakMap<ts.SourceFile, ts.SourceFile[]>;
  globals: ts.SourceFile[];
  reachable: Map<ts.SourceFile, Set<ts.SourceFile>>;
}

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

const getModuleSpecifiers = (
  sourceFile: ts.SourceFile,
): readonly ts.StringLiteralLike[] => {
  const sourceFileWithImports = sourceFile as ts.SourceFile & {
    imports?: readonly ts.StringLiteralLike[];
  };

  if (sourceFileWithImports.imports !== void 0) {
    return sourceFileWithImports.imports;
  }

  const imports: ts.StringLiteralLike[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteralLike(node) && isModuleSpecifier(node)) {
      imports.push(node);
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return imports;
};

const getSourceDependencies = (
  sourceFile: ts.SourceFile,
  program: ts.Program,
  cache: SourceReachability,
): ts.SourceFile[] => {
  const cached = cache.dependencies.get(sourceFile);
  if (cached !== void 0) {
    return cached;
  }
  const dependencies = new Set<ts.SourceFile>();
  const checker = program.getTypeChecker();
  for (const moduleSpecifier of getModuleSpecifiers(sourceFile)) {
    const symbol = checker.getSymbolAtLocation(moduleSpecifier);
    if (symbol === void 0 || (symbol.flags & ts.SymbolFlags.Module) === 0) {
      continue;
    }

    const declarations = symbol.declarations ?? [];
    for (const declaration of declarations) {
      dependencies.add(declaration.getSourceFile());
    }
  }
  for (const reference of sourceFile.referencedFiles) {
    const referencedFile = program.getSourceFile(
      ts.resolveTripleslashReference(reference.fileName, sourceFile.fileName),
    );
    if (referencedFile === void 0) {
      continue;
    }

    dependencies.add(referencedFile);
  }
  const result = [...dependencies];
  cache.dependencies.set(sourceFile, result);
  return result;
};

const canSourceReachMember = (
  sourceFile: ts.SourceFile,
  memberSymbol: ts.Symbol,
  program: ts.Program,
): boolean => {
  const declarations = memberSymbol.declarations;
  if (declarations === void 0 || declarations.length === 0) {
    return true;
  }
  let cache = getMemberProgramCache(program, "source-reachability", "") as
    SourceReachability | undefined;

  if (cache === void 0) {
    cache = {
      dependencies: new WeakMap(),
      globals: program
        .getSourceFiles()
        .filter(
          (file) =>
            !ts.isExternalModule(file) ||
            file.statements.some(
              (statement) =>
                ts.isModuleDeclaration(statement) &&
                (ts.isStringLiteral(statement.name) ||
                  (statement.flags & ts.NodeFlags.GlobalAugmentation) !== 0),
            ),
        ),
      reachable: new Map(),
    };
    setMemberProgramCache(program, "source-reachability", "", cache);
  }

  let reachable = cache.reachable.get(sourceFile);

  if (reachable === void 0) {
    reachable = new Set();
    const pending = [sourceFile, ...cache.globals];
    while (pending.length > 0) {
      const file = pending.pop();
      if (file === void 0 || reachable.has(file)) {
        continue;
      }
      reachable.add(file);
      pending.push(...getSourceDependencies(file, program, cache));
    }
    cache.reachable.set(sourceFile, reachable);

    while (cache.reachable.size > MAX_CACHED_REACHABILITY_ROOTS) {
      const oldestSourceFile = cache.reachable.keys().next().value;

      if (oldestSourceFile === void 0) {
        break;
      }

      cache.reachable.delete(oldestSourceFile);
    }
  } else {
    cache.reachable.delete(sourceFile);
    cache.reachable.set(sourceFile, reachable);
  }
  return declarations.some((declaration) =>
    reachable.has(declaration.getSourceFile()),
  );
};

export { canSourceReachMember };
