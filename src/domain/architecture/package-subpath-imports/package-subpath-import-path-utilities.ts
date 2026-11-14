import { statSync } from "node:fs";
import path from "node:path";

/** File extensions probed when a relative specifier omits its target file. */
const RESOLUTION_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".d.ts",
  ".d.mts",
  ".d.cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
] as const;

/**
 * Converts an absolute path inside the package to a POSIX package-relative path.
 * @param packageRoot Absolute package directory.
 * @param absolutePath Absolute path to convert.
 * @returns Package-relative POSIX path or undefined when outside the package.
 * @example
 * ```typescript
 * const packagePath = toPackagePath("/repo", "/repo/src/feature.ts");
 * ```
 */
export const toPackagePath = (
  packageRoot: string,
  absolutePath: string,
): string | undefined => {
  const packageRelativePath = path.relative(packageRoot, absolutePath);
  const isOutsidePackage =
    packageRelativePath === "" ||
    packageRelativePath === ".." ||
    packageRelativePath.startsWith(`..${path.sep}`) ||
    packageRelativePath.startsWith("../") ||
    path.isAbsolute(packageRelativePath);

  return isOutsidePackage
    ? void 0
    : packageRelativePath.split(path.sep).join("/");
};

/**
 * Checks whether one absolute path is a file on disk.
 * @param candidate Absolute path to inspect.
 * @returns True when the path exists and is a file.
 * @example
 * ```typescript
 * const isFile = isFilePath("/repo/src/feature.ts");
 * ```
 */
const isFilePath = (candidate: string): boolean => {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
};

/**
 * Checks whether one absolute path sits inside a directory subtree.
 * @param directory Absolute directory to test against.
 * @param candidate Absolute path to locate.
 * @returns True when the candidate is the directory or one of its descendants.
 * @example
 * ```typescript
 * const inside = isPathInsideDirectory("/repo/src", "/repo/src/feature.ts");
 * ```
 */
export const isPathInsideDirectory = (
  directory: string,
  candidate: string,
): boolean => {
  const relative = path.relative(directory, candidate);

  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !relative.startsWith("../") &&
      !path.isAbsolute(relative))
  );
};

/**
 * Finds the first on-disk extension or index candidate relevant to one alias.
 * @param resolvedPath Absolute resolved specifier path.
 * @param packagePath POSIX package-relative literal path.
 * @param isRelevantCandidate Tests whether a candidate can match the alias.
 * @param doesCandidateFileExist Checks whether a candidate file exists.
 * @returns First relevant candidate package path, or undefined.
 * @example
 * ```typescript
 * const candidate = findCandidatePackagePath("/repo/src/domain", "src/domain", () => true);
 * ```
 */
export const findCandidatePackagePath = (
  resolvedPath: string,
  packagePath: string,
  isRelevantCandidate: (candidatePackagePath: string) => boolean,
  doesCandidateFileExist: (candidatePath: string) => boolean = isFilePath,
): string | undefined => {
  for (const extension of RESOLUTION_EXTENSIONS) {
    const candidatePackagePath = `${packagePath}${extension}`;

    if (
      isRelevantCandidate(candidatePackagePath) &&
      doesCandidateFileExist(`${resolvedPath}${extension}`)
    ) {
      return candidatePackagePath;
    }
  }

  for (const extension of RESOLUTION_EXTENSIONS) {
    const candidatePackagePath = `${packagePath}/index${extension}`;

    if (
      isRelevantCandidate(candidatePackagePath) &&
      doesCandidateFileExist(path.join(resolvedPath, `index${extension}`))
    ) {
      return candidatePackagePath;
    }
  }

  return void 0;
};
