import * as ts from "typescript";

import {
  getSourceFileFacts,
  getSourceReferenceSymbol,
} from "./source-file-facts";

interface ProgramDependencies {
  dependencies: WeakMap<ts.SourceFile, readonly ts.SourceFile[]>;
  globals: readonly ts.SourceFile[];
}

const programDependencies = new WeakMap<ts.Program, ProgramDependencies>();

const getProgramDependencies = (program: ts.Program): ProgramDependencies => {
  let index = programDependencies.get(program);
  if (index === void 0) {
    index = {
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
    };
    programDependencies.set(program, index);
  }
  return index;
};

/**
 * Resolves module and triple-slash edges independently of rule options.
 * @param sourceFile Source whose outgoing dependencies are requested.
 * @param program TypeScript semantic snapshot.
 * @returns Referenced source files without treating imports as concrete usage.
 * @example
 * ```typescript
 * const dependencies = getSourceDependencies(sourceFile, program);
 * ```
 */
const getSourceDependencies = (
  sourceFile: ts.SourceFile,
  program: ts.Program,
): readonly ts.SourceFile[] => {
  const index = getProgramDependencies(program);
  const cached = index.dependencies.get(sourceFile);
  if (cached !== void 0) {
    return cached;
  }
  const dependencies = new Set<ts.SourceFile>();
  const sourceWithImports = sourceFile as ts.SourceFile & {
    imports?: readonly ts.StringLiteralLike[];
  };
  const imports =
    sourceWithImports.imports ??
    getSourceFileFacts(sourceFile).moduleSpecifiers;
  for (const specifier of imports) {
    const symbol = getSourceReferenceSymbol(program, specifier);
    if (symbol === void 0 || (symbol.flags & ts.SymbolFlags.Module) === 0) {
      continue;
    }
    const declarations = symbol.declarations ?? [];
    for (const declaration of declarations) {
      dependencies.add(declaration.getSourceFile());
    }
  }
  for (const reference of sourceFile.referencedFiles) {
    const dependency = program.getSourceFile(
      ts.resolveTripleslashReference(reference.fileName, sourceFile.fileName),
    );
    if (dependency !== void 0) {
      dependencies.add(dependency);
    }
  }
  const result = [...dependencies];
  index.dependencies.set(sourceFile, result);
  return result;
};

/**
 * Retains global scripts and augmentations as conservative reachability roots.
 * @param program TypeScript semantic snapshot.
 * @returns Sources that can contribute types without an explicit import edge.
 * @example
 * ```typescript
 * const globals = getGlobalSourceFiles(program);
 * ```
 */
const getGlobalSourceFiles = (program: ts.Program): readonly ts.SourceFile[] =>
  getProgramDependencies(program).globals;

export { getGlobalSourceFiles, getSourceDependencies };
