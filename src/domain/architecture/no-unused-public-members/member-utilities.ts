import { ESLintUtils } from "@typescript-eslint/utils";
import path from "node:path";
import * as ts from "typescript";

import type { NoUnusedExportsState } from "../no-unused-exports/types";
import type { MemberUsageAdapter } from "./member-usage-utilities";

import { collectPublicMembers } from "./member-declaration-utilities";
import {
  isPublicApiHost,
  isPublicApiMember,
} from "./member-public-api-utilities";
import { hasProductionUsage } from "./member-usage-utilities";

type ParserServices = ReturnType<typeof ESLintUtils.getParserServices>;

const programSourceFiles = new WeakMap<
  ts.Program,
  Map<string, ts.SourceFile>
>();

/**
 * Gets source files by normalized absolute path for one Program.
 * @param program TypeScript program snapshot.
 * @returns Cached source-file index.
 * @example
 * ```typescript
 * const files = getProgramSourceFileIndex(program);
 * ```
 */
const getProgramSourceFileIndex = (
  program: ts.Program,
): Map<string, ts.SourceFile> => {
  let sourceFiles = programSourceFiles.get(program);

  if (sourceFiles === void 0) {
    sourceFiles = new Map(
      program
        .getSourceFiles()
        .map((sourceFile) => [
          path.resolve(sourceFile.fileName).toLowerCase(),
          sourceFile,
        ]),
    );
    programSourceFiles.set(program, sourceFiles);
  }

  return sourceFiles;
};

/**
 * Collects unused direct public members from a linted source file.
 * @param sourceFile Source file being linted.
 * @param program TypeScript project program.
 * @param state Normalized public API and test patterns.
 * @param repoRoot Root directory used for glob matching.
 * @param parserServices TypeScript and ESTree node maps.
 * @param usageAdapters Adapters that recognize usage outside TypeScript source.
 * @returns Members outside the public API with no production use.
 * @example
 * ```typescript
 * const unused = collectUnusedPublicMembers(sourceFile, program, state, repoRoot, services);
 * ```
 */
const collectUnusedPublicMembers = (
  sourceFile: ts.SourceFile,
  program: ts.Program,
  state: NoUnusedExportsState,
  repoRoot: string,
  parserServices: ParserServices,
  usageAdapters: readonly MemberUsageAdapter[] = [],
) => {
  const checker = program.getTypeChecker();

  return collectPublicMembers(sourceFile, checker, parserServices).filter(
    (member) =>
      !isPublicApiHost(program, state, repoRoot, member.hostSymbol) &&
      !hasProductionUsage(program, state, repoRoot, member, usageAdapters) &&
      !isPublicApiMember(program, state, repoRoot, member.memberSymbol),
  );
};

/**
 * Finds the program source file matching an absolute lint filename.
 * @param program TypeScript project program.
 * @param filename Absolute filename to find.
 * @returns Matching source file when it belongs to the program.
 * @example
 * ```typescript
 * const sourceFile = getProgramSourceFile(program, context.filename);
 * ```
 */
const getProgramSourceFile = (
  program: ts.Program,
  filename: string,
): ts.SourceFile | undefined =>
  getProgramSourceFileIndex(program).get(path.resolve(filename).toLowerCase());

/**
 * Returns the absolute project root from the TypeScript program.
 * @param program TypeScript project program.
 * @returns Absolute TypeScript project root.
 * @example
 * ```typescript
 * const projectRoot = getProjectRoot(program);
 * ```
 */
const getProjectRoot = (program: ts.Program): string =>
  path.resolve(program.getCurrentDirectory());

export { collectUnusedPublicMembers, getProgramSourceFile, getProjectRoot };
