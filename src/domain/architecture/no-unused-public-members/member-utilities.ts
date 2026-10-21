import { ESLintUtils } from "@typescript-eslint/utils";
import path from "node:path";
import * as ts from "typescript";

import type { NoUnusedExportsState } from "../no-unused-exports/types";

import { collectPublicMembers } from "./member-declaration-utilities";
import {
  isPublicApiHost,
  isPublicApiMember,
} from "./member-public-api-utilities";
import { hasProductionUsage } from "./member-usage-utilities";

type ParserServices = ReturnType<typeof ESLintUtils.getParserServices>;

/**
 * Collects unused direct public members from a linted source file.
 * @param sourceFile Source file being linted.
 * @param program TypeScript project program.
 * @param state Normalized public API and test patterns.
 * @param repoRoot Root directory used for glob matching.
 * @param parserServices TypeScript and ESTree node maps.
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
) => {
  const checker = program.getTypeChecker();

  return collectPublicMembers(sourceFile, checker, parserServices).filter(
    (member) =>
      !isPublicApiHost(program, state, repoRoot, member.hostSymbol) &&
      !isPublicApiMember(program, state, repoRoot, member.memberSymbol) &&
      !hasProductionUsage(program, state, repoRoot, member),
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
  program
    .getSourceFiles()
    .find(
      (sourceFile) =>
        path.resolve(sourceFile.fileName).toLowerCase() ===
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
