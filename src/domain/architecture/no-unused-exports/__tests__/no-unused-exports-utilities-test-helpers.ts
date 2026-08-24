import type { AST } from "eslint";

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as ts from "typescript";
import { parser } from "typescript-eslint";

/**
 * Parses one TypeScript module and returns its program node.
 * @param code Source text.
 * @returns Parsed program node.
 * @example
 * ```typescript
 * const program = parseProgram("export const value = 1;");
 * ```
 */
const parseProgram = (code: string): AST.Program =>
  parser.parseForESLint(code).ast as AST.Program;

/**
 * Runs one callback inside a temporary directory and always cleans up.
 * @param prefix Prefix used for temporary directory names.
 * @param callback Operation to execute inside the temp directory.
 * @returns Callback return value.
 * @example
 * ```typescript
 * const result = withTemporaryDirectory("fixture-", (root) => root);
 * ```
 */
const withTemporaryDirectory = <Result>(
  prefix: string,
  callback: (temporaryRoot: string) => Result,
): Result => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), prefix));

  try {
    return callback(temporaryRoot);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

/**
 * Writes one relative file tree below a directory root.
 * @param temporaryRoot Directory receiving the file tree.
 * @param files Mapping from POSIX-relative paths to file contents.
 * @returns Map from relative paths to resolved absolute paths.
 * @example
 * ```typescript
 * const paths = writeProjectFiles(root, { "src/a.ts": "export {};\n" });
 * ```
 */
const writeProjectFiles = (
  temporaryRoot: string,
  files: Readonly<Record<string, string>>,
): Map<string, string> => {
  const resolvedPaths = new Map<string, string>();

  for (const [relativePath, fileContent] of Object.entries(files)) {
    const absolutePath = path.join(temporaryRoot, relativePath);

    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, fileContent);
    resolvedPaths.set(relativePath, absolutePath);
  }

  return resolvedPaths;
};

/**
 * Creates one temporary TypeScript project and runs one callback with it.
 * @param prefix Prefix used for the temporary directory name.
 * @param files Mapping from POSIX-relative paths to file contents.
 * @param callback Operation receiving the root path, program, and path resolver.
 * @returns Callback return value.
 * @example
 * ```typescript
 * const usages = withTemporaryProject("fixture-", files, (root, program, resolvePath) => usages);
 * ```
 */
const withTemporaryProject = <Result>(
  prefix: string,
  files: Readonly<Record<string, string>>,
  callback: (
    temporaryRoot: string,
    program: ts.Program,
    resolvePath: (relativePath: string) => string,
  ) => Result,
): Result =>
  withTemporaryDirectory(prefix, (temporaryRoot) => {
    const resolvedPaths = writeProjectFiles(temporaryRoot, files);
    const resolveWrittenPath = (relativePath: string): string => {
      const resolvedPath = resolvedPaths.get(relativePath);

      if (resolvedPath === void 0) {
        throw new Error(`Unknown fixture path: ${relativePath}`);
      }

      return resolvedPath;
    };
    const programRoots = Object.keys(files).map((relativePath) =>
      resolveWrittenPath(relativePath),
    );

    const program = ts.createProgram(programRoots, {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ESNext,
    });

    return callback(temporaryRoot, program, resolveWrittenPath);
  });

/**
 * Creates one fake symbol for branch-focused type-checker tests.
 * @param fileName Source file that owns the declaration.
 * @param declarationName Symbol name used for diagnostics.
 * @param pos Declaration start position.
 * @returns Fake symbol with one declaration key.
 * @example
 * ```typescript
 * const symbol = createFakeSymbol("/repo/src/feature.ts", "feature", 0);
 * ```
 */
const createFakeSymbol = (
  fileName: string,
  declarationName: string,
  pos: number,
): ts.Symbol =>
  ({
    declarations: [
      {
        end: pos + 1,
        getSourceFile: () => ({ fileName }) as ts.SourceFile,
        pos,
      } as never,
    ],
    flags: 0,
    getName: () => declarationName,
  }) as never;

/**
 * Creates one fake program with just the members used by the utility tests.
 * @param sourceFiles Source files exposed by the fake program.
 * @param checker Type checker used by the fake program.
 * @returns Fake TypeScript program.
 * @example
 * ```typescript
 * const program = createFakeProgram([], {} as never);
 * ```
 */
const createFakeProgram = (
  sourceFiles: ts.SourceFile[],
  checker: ts.TypeChecker,
): ts.Program =>
  ({
    getSourceFiles: () => sourceFiles,
    getTypeChecker: () => checker,
  }) as never;

export {
  createFakeProgram,
  createFakeSymbol,
  parseProgram,
  withTemporaryProject,
};
