import { Minimatch } from "minimatch";
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

interface AnalysisScopeIndex {
  fileToScope: Map<string, MemberAnalysisScope>;
  scopes: MemberAnalysisScope[];
}

interface MemberAnalysisScope {
  apiFiles: ts.SourceFile[];
  root: string;
  sourceFiles: Set<ts.SourceFile>;
}

const compiledMinimatchCache = new Map<
  string,
  InstanceType<typeof Minimatch>
>();

const getCompiledMinimatch = (
  pattern: string,
): InstanceType<typeof Minimatch> => {
  const normalizedPattern = pattern.replaceAll("\\", "/");
  const cacheKey = `${normalizedPattern}::${ts.sys.useCaseSensitiveFileNames ? "case" : "nocase"}`;
  let matcher = compiledMinimatchCache.get(cacheKey);

  if (matcher === void 0) {
    matcher = new Minimatch(normalizedPattern, {
      dot: true,
      nocase: !ts.sys.useCaseSensitiveFileNames,
    });
    compiledMinimatchCache.set(cacheKey, matcher);
  }

  return matcher;
};

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
    getCompiledMinimatch(pattern).match(relative),
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

const getMemberAnalysisScopeIndex = (
  program: ts.Program,
  state: NoUnusedExportsState,
  repoRoot: string,
): AnalysisScopeIndex => {
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
  ) as AnalysisScopeIndex | undefined;
  if (cached !== void 0) {
    return cached;
  }
  const scopes = collectApiScopes(program, state, projectRoot);
  const fileToScope = new Map<string, MemberAnalysisScope>();

  for (const sourceFile of program.getSourceFiles()) {
    if (
      sourceFile.isDeclarationFile ||
      !isProjectSourceFile(sourceFile.fileName, projectRoot) ||
      isTestFile(sourceFile.fileName, state, projectRoot)
    ) {
      continue;
    }
    const matchingScope = scopes.find((scope) =>
      containsFile(scope.root, sourceFile.fileName),
    );
    if (matchingScope === void 0) {
      continue;
    }
    matchingScope.sourceFiles.add(sourceFile);
    fileToScope.set(normalizePath(sourceFile.fileName), matchingScope);
  }

  const index: AnalysisScopeIndex = { fileToScope, scopes };
  setMemberProgramCache(program, "member-analysis-scopes", cacheKey, index);
  return index;
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
  const index = getMemberAnalysisScopeIndex(program, state, repoRoot);
  const normalizedFilename = normalizePath(filename);
  let scope = index.fileToScope.get(normalizedFilename);

  if (scope === void 0) {
    scope = index.scopes.find((candidate) =>
      containsFile(candidate.root, filename),
    );
    if (scope !== void 0) {
      index.fileToScope.set(normalizedFilename, scope);
    }
  }

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
  getMemberAnalysisScopeIndex(program, state, repoRoot).scopes.flatMap(
    (scope) => scope.apiFiles,
  );

export { getMemberAnalysisScope, getMemberApiSourceFiles };
export type { MemberAnalysisScope };
