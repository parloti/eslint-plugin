import { ESLintUtils } from "@typescript-eslint/utils";
import path from "node:path";
import * as ts from "typescript";

import type { NoUnusedExportsState } from "../no-unused-exports/types";
import type { MemberUsageAdapter } from "./member-usage-utilities";

import { isProjectSourceFile } from "../no-unused-exports/no-unused-exports-options";
import { collectPublicMembers } from "./member-declaration-utilities";
import { collectOperationMembers } from "./member-operation-utilities";
import {
  getMemberProgramCache,
  setMemberProgramCache,
} from "./member-program-cache-utilities";
import {
  isPublicApiHost,
  isPublicApiMember,
} from "./member-public-api-utilities";
import { getMemberAnalysisScope } from "./member-scope-utilities";
import { getProductionUsageIndex } from "./member-usage-index-utilities";
import { hasProductionReference } from "./member-usage-utilities";

type ParserServices = ReturnType<typeof ESLintUtils.getParserServices>;

/**
 * Gets source files by normalized absolute path for one Program.
 * @param program TypeScript program snapshot.
 * @param projectRoot Project root used to limit the index to source files.
 * @returns Cached source-file index.
 * @example
 * ```typescript
 * const files = getProgramSourceFileIndex(program, projectRoot);
 * ```
 */
const getProgramSourceFileIndex = (
  program: ts.Program,
  projectRoot: string,
): Map<string, ts.SourceFile> => {
  const normalizedRoot = path.resolve(projectRoot);
  const cacheKey = normalizedRoot.toLowerCase();
  const cached = getMemberProgramCache(
    program,
    "source-file-index",
    cacheKey,
  ) as Map<string, ts.SourceFile> | undefined;

  if (cached !== void 0) {
    return cached;
  }

  const sourceFiles = new Map(
    program
      .getSourceFiles()
      .filter((sourceFile) =>
        isProjectSourceFile(sourceFile.fileName, normalizedRoot),
      )
      .map((sourceFile) => [
        path.resolve(sourceFile.fileName).toLowerCase(),
        sourceFile,
      ]),
  );
  setMemberProgramCache(program, "source-file-index", cacheKey, sourceFiles);

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
  const members = collectPublicMembers(sourceFile, checker, parserServices);
  if (members.length === 0) {
    return members;
  }
  const scope = getMemberAnalysisScope(
    program,
    state,
    repoRoot,
    sourceFile.fileName,
  );

  const pending = members.filter(
    (member) =>
      !isPublicApiHost(program, state, repoRoot, member.hostSymbol) &&
      !hasProductionReference(
        program,
        state,
        repoRoot,
        member,
        scope,
        usageAdapters,
      ),
  );
  if (pending.length === 0) {
    return pending;
  }
  const used = collectOperationMembers(
    getProductionUsageIndex(program, state, repoRoot, scope).operations,
    pending,
    program,
    scope,
  );
  return pending.filter(
    (member) =>
      !used.has(member) &&
      !isPublicApiMember(program, state, repoRoot, member.memberSymbol),
  );
};

/**
 * Finds the program source file matching an absolute lint filename.
 * @param program TypeScript project program.
 * @param filename Absolute filename to find.
 * @param projectRoot Project root used to limit the search to source files.
 * @returns Matching source file when it belongs to the program.
 * @example
 * ```typescript
 * const sourceFile = getProgramSourceFile(
 *   program,
 *   context.filename,
 *   projectRoot,
 * );
 * ```
 */
const getProgramSourceFile = (
  program: ts.Program,
  filename: string,
  projectRoot: string,
): ts.SourceFile | undefined =>
  getProgramSourceFileIndex(program, projectRoot).get(
    path.resolve(filename).toLowerCase(),
  );

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
