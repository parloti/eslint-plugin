import * as ts from "typescript";

interface SourceReachability {
  dependencies: WeakMap<ts.SourceFile, ts.SourceFile[]>;
  globals: ts.SourceFile[];
  reachable: WeakMap<ts.SourceFile, Set<ts.SourceFile>>;
}

const programReachability = new WeakMap<ts.Program, SourceReachability>();

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
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteralLike(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      if (symbol !== void 0 && (symbol.flags & ts.SymbolFlags.Module) !== 0) {
        const declarations = symbol.declarations ?? [];
        for (const declaration of declarations) {
          dependencies.add(declaration.getSourceFile());
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  for (const reference of sourceFile.referencedFiles) {
    const referencedFile = program.getSourceFile(
      ts.resolveTripleslashReference(reference.fileName, sourceFile.fileName),
    );
    if (referencedFile !== void 0) {
      dependencies.add(referencedFile);
    }
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
  let cache = programReachability.get(program);
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
      reachable: new WeakMap(),
    };
    programReachability.set(program, cache);
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
  }
  return declarations.some((declaration) =>
    reachable.has(declaration.getSourceFile()),
  );
};

export { canSourceReachMember };
