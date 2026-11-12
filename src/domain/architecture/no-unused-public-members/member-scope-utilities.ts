import { minimatch } from "minimatch";
import path from "node:path";
import * as ts from "typescript";

import type { NoUnusedExportsState } from "../no-unused-exports/types";

import {
  isProjectSourceFile,
  isTestFile,
} from "../no-unused-exports/no-unused-exports-options";
import {
  getMemberProgramCache,
  setMemberProgramCache,
} from "./member-program-cache-utilities";

interface MemberAnalysisScope {
  apiFiles: ts.SourceFile[];
  root: string;
  sourceFiles: Set<ts.SourceFile>;
}

const normalizePath = (filename: string): string => {
  const absolute = path.resolve(filename);
  return ts.sys.useCaseSensitiveFileNames ? absolute : absolute.toLowerCase();
};

const containsFile = (root: string, filename: string): boolean => {
  const relative = path.relative(root, normalizePath(filename));
  return (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
};

const matchesApiFile = (
  filename: string,
  state: NoUnusedExportsState,
  projectRoot: string,
): boolean => {
  if (!containsFile(projectRoot, filename)) {
    return false;
  }
  const relative = path
    .relative(projectRoot, normalizePath(filename))
    .split(path.sep)
    .join("/");
  return state.publicApiFiles.some((pattern) =>
    minimatch(relative, pattern.replaceAll("\\", "/"), {
      dot: true,
      nocase: !ts.sys.useCaseSensitiveFileNames,
    }),
  );
};

const collectApiScopes = (
  program: ts.Program,
  state: NoUnusedExportsState,
  projectRoot: string,
): MemberAnalysisScope[] => {
  const scopes = new Map<string, MemberAnalysisScope>();
  for (const sourceFile of program.getSourceFiles()) {
    if (
      sourceFile.isDeclarationFile ||
      isTestFile(sourceFile.fileName, state, projectRoot) ||
      !matchesApiFile(sourceFile.fileName, state, projectRoot)
    ) {
      continue;
    }
    const root = normalizePath(path.dirname(sourceFile.fileName));
    const scope: MemberAnalysisScope = scopes.get(root) ?? {
      apiFiles: [],
      root,
      sourceFiles: new Set(),
    };
    scope.apiFiles.push(sourceFile);
    scopes.set(root, scope);
  }
  const result = scopes.values().toArray();
  for (const scope of result) {
    const overlapping = result.find(
      (other) => other !== scope && containsFile(scope.root, other.root),
    );
    if (overlapping !== void 0) {
      throw new Error(
        `Invalid publicApiFiles: overlapping API folders '${scope.root}' (${scope.apiFiles.map((file) => file.fileName).join(", ")}) and '${overlapping.root}' (${overlapping.apiFiles.map((file) => file.fileName).join(", ")}). Configure non-overlapping API entries for no-unused-public-members.`,
      );
    }
  }
  return result;
};

const getMemberAnalysisScopes = (
  program: ts.Program,
  state: NoUnusedExportsState,
  repoRoot: string,
): MemberAnalysisScope[] => {
  const projectRoot = normalizePath(repoRoot);
  const cacheKey = JSON.stringify([
    projectRoot,
    state.publicApiFiles,
    state.testFilePatterns,
  ]);
  const cached = getMemberProgramCache(
    program,
    "member-analysis-scopes",
    cacheKey,
  ) as MemberAnalysisScope[] | undefined;
  if (cached !== void 0) {
    return cached;
  }
  const scopes = collectApiScopes(program, state, projectRoot);
  for (const sourceFile of program.getSourceFiles()) {
    if (
      sourceFile.isDeclarationFile ||
      !isProjectSourceFile(sourceFile.fileName, projectRoot) ||
      isTestFile(sourceFile.fileName, state, projectRoot)
    ) {
      continue;
    }
    scopes
      .find((scope) => containsFile(scope.root, sourceFile.fileName))
      ?.sourceFiles.add(sourceFile);
  }
  setMemberProgramCache(program, "member-analysis-scopes", cacheKey, scopes);
  return scopes;
};

/**
 * Resolves the uniquely configured API folder owning a candidate host.
 * @param program Active TypeScript program.
 * @param state Effective rule options.
 * @param repoRoot Project root used for glob matching.
 * @param filename Source file declaring the host.
 * @returns Scope containing the host and its eligible production consumers.
 * @example
 * ```typescript
 * const scope = getMemberAnalysisScope(program, state, repoRoot, filename);
 * ```
 */
const getMemberAnalysisScope = (
  program: ts.Program,
  state: NoUnusedExportsState,
  repoRoot: string,
  filename: string,
): MemberAnalysisScope => {
  const scope = getMemberAnalysisScopes(program, state, repoRoot).find(
    (candidate) => containsFile(candidate.root, filename),
  );
  if (scope === void 0) {
    throw new Error(
      `Invalid publicApiFiles: no analysis folder covers '${filename}'. Configure a non-test, non-declaration API entry whose parent contains this host. Patterns: ${state.publicApiFiles.join(", ")}.`,
    );
  }
  return scope;
};

/**
 * Gets eligible API entries without changing the export rule's consumer scope.
 * @param program Active TypeScript program.
 * @param state Effective member-rule options.
 * @param repoRoot Project root used for glob matching.
 * @returns Configured API source files grouped by their validated folders.
 * @example
 * ```typescript
 * const entries = getMemberApiSourceFiles(program, state, repoRoot);
 * ```
 */
const getMemberApiSourceFiles = (
  program: ts.Program,
  state: NoUnusedExportsState,
  repoRoot: string,
): ts.SourceFile[] =>
  getMemberAnalysisScopes(program, state, repoRoot).flatMap(
    (scope) => scope.apiFiles,
  );

export { getMemberAnalysisScope, getMemberApiSourceFiles };
export type { MemberAnalysisScope };
