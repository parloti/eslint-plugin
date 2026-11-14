import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";

import type { PackageSubpathImportState } from "./package-subpath-import-types";

import { parsePackageSubpathImportAliases } from "./package-subpath-import-alias-utilities";
import {
  matchPackageSubpathImportAlias,
  splitModuleSpecifier,
} from "./package-subpath-import-matching-utilities";
import {
  findCandidatePackagePath,
  isPathInsideDirectory,
  toPackagePath,
} from "./package-subpath-import-path-utilities";

/** Maximum number of package manifests retained in the process cache. */
const PACKAGE_STATE_CACHE_LIMIT = 128;

/** Parsed package state and filesystem metadata used to validate its cache entry. */
interface PackageStateCacheEntry {
  /** File change time in milliseconds. */
  changeTime: number;

  /** File modification time in milliseconds. */
  modificationTime: number;

  /** File size in bytes. */
  size: number;

  /** Parsed package state. */
  state: PackageSubpathImportState;
}

/** Bounded cache shared by rule instances for unchanged package manifests. */
const packageStateCache = new Map<string, PackageStateCacheEntry>();

/**
 * Finds the nearest ancestor package.json for one linted file.
 * @param startDirectory Absolute directory to begin searching from.
 * @returns Absolute package.json path or undefined when none exists.
 * @example
 * ```typescript
 * const packageJsonPath = findPackageJsonPath("/repo/packages/app/src");
 * ```
 */
const findPackageJsonPath = (startDirectory: string): string | undefined => {
  let directory = path.resolve(startDirectory);
  let parentDirectory = path.dirname(directory);

  while (directory !== parentDirectory) {
    const candidate = path.join(directory, "package.json");

    if (existsSync(candidate)) {
      return candidate;
    }

    directory = parentDirectory;
    parentDirectory = path.dirname(directory);
  }

  const rootCandidate = path.join(directory, "package.json");

  return existsSync(rootCandidate) ? rootCandidate : void 0;
};

/**
 * Loads normalized aliases for the package that owns one linted file.
 * @param absoluteFilename Absolute linted filename.
 * @returns Package state or undefined when no package.json exists.
 * @example
 * ```typescript
 * const state = loadPackageSubpathImportState("/repo/packages/app/src/feature.ts");
 * ```
 */
const loadPackageSubpathImportState = (
  absoluteFilename: string,
): PackageSubpathImportState | undefined => {
  const packageJsonPath = findPackageJsonPath(path.dirname(absoluteFilename));

  if (packageJsonPath === void 0) {
    return void 0;
  }

  const packageRoot = path.dirname(packageJsonPath);
  let packageJsonStats: ReturnType<typeof statSync>;

  try {
    packageJsonStats = statSync(packageJsonPath);
  } catch {
    return { aliases: [], packageRoot };
  }

  if (!packageJsonStats.isFile()) {
    return { aliases: [], packageRoot };
  }

  const cachedState = packageStateCache.get(packageJsonPath);

  if (
    cachedState !== void 0 &&
    cachedState.changeTime === packageJsonStats.ctimeMs &&
    cachedState.modificationTime === packageJsonStats.mtimeMs &&
    cachedState.size === packageJsonStats.size
  ) {
    return cachedState.state;
  }

  let packageJsonText: string;

  try {
    packageJsonText = readFileSync(packageJsonPath, "utf8");
  } catch {
    return { aliases: [], packageRoot };
  }

  const state: PackageSubpathImportState = {
    aliases: parsePackageSubpathImportAliases(packageJsonText),
    packageRoot,
  };

  if (packageStateCache.has(packageJsonPath)) {
    packageStateCache.delete(packageJsonPath);
  } else if (packageStateCache.size >= PACKAGE_STATE_CACHE_LIMIT) {
    const oldestPath = packageStateCache.keys().next().value;

    if (oldestPath !== void 0) {
      packageStateCache.delete(oldestPath);
    }
  }

  packageStateCache.set(packageJsonPath, {
    changeTime: packageJsonStats.ctimeMs,
    modificationTime: packageJsonStats.mtimeMs,
    size: packageJsonStats.size,
    state,
  });

  return state;
};

/**
 * Checks whether one module specifier is relative.
 * @param source Module specifier text.
 * @returns True when the specifier starts with `./`, `../`, `.` or `..`.
 * @example
 * ```typescript
 * const relative = isRelativeModuleSpecifier("../feature");
 * ```
 */
const isRelativeModuleSpecifier = (source: string): boolean =>
  source === "." ||
  source === ".." ||
  source.startsWith("./") ||
  source.startsWith("../");

/**
 * Creates a lazy matcher for package.json `#` imports owned by one file.
 * @param filename Linted filename, absolute or relative to `workingDirectory`.
 * @param workingDirectory Base directory used for relative filenames.
 * @returns Matcher returning the preferred `#` specifier for a relative path.
 * @example
 * ```typescript
 * const matchAlias = createPackageSubpathImportMatcher(filename, cwd);
 * ```
 */
const createPackageSubpathImportMatcher = (
  filename: string,
  workingDirectory: string = cwd(),
): ((sourceSpecifier: string) => string | undefined) => {
  const absoluteFilename = path.isAbsolute(filename)
    ? filename
    : path.resolve(workingDirectory, filename);
  let packageState: PackageSubpathImportState | undefined;
  let packageStateLoaded = false;
  let filePackagePath: string | undefined;
  let filePackagePathComputed = false;
  const fileExistenceCache = new Map<string, boolean>();

  const doesCandidateFileExist = (candidatePath: string): boolean => {
    const cachedResult = fileExistenceCache.get(candidatePath);

    if (cachedResult !== void 0) {
      return cachedResult;
    }

    try {
      const result = statSync(candidatePath).isFile();

      fileExistenceCache.set(candidatePath, result);

      return result;
    } catch {
      fileExistenceCache.set(candidatePath, false);

      return false;
    }
  };

  const getFilePackagePath = (): string | undefined => {
    if (!filePackagePathComputed) {
      filePackagePathComputed = true;
      filePackagePath =
        packageState === void 0
          ? void 0
          : toPackagePath(packageState.packageRoot, absoluteFilename);
    }

    return filePackagePath;
  };

  return (sourceSpecifier: string): string | undefined => {
    if (!isRelativeModuleSpecifier(sourceSpecifier)) {
      return void 0;
    }

    if (!packageStateLoaded) {
      packageState = loadPackageSubpathImportState(absoluteFilename);
      packageStateLoaded = true;
    }

    if (packageState === void 0 || packageState.aliases.length === 0) {
      return void 0;
    }

    const { pathPart, suffix } = splitModuleSpecifier(sourceSpecifier);
    const resolvedPath = path.resolve(path.dirname(absoluteFilename), pathPart);
    const packagePath = toPackagePath(packageState.packageRoot, resolvedPath);

    if (packagePath === void 0) {
      return void 0;
    }

    const insideOwnDirectory = isPathInsideDirectory(
      path.dirname(absoluteFilename),
      resolvedPath,
    );
    const currentFilePackagePath = getFilePackagePath();

    for (const alias of packageState.aliases) {
      const directAliasSpecifier = matchPackageSubpathImportAlias(
        alias,
        packagePath,
      );
      const candidatePackagePath =
        directAliasSpecifier === void 0
          ? findCandidatePackagePath(
              resolvedPath,
              packagePath,
              (candidate) =>
                matchPackageSubpathImportAlias(alias, candidate) !== void 0,
              doesCandidateFileExist,
            )
          : void 0;
      const aliasSpecifier =
        directAliasSpecifier ??
        (candidatePackagePath === void 0
          ? void 0
          : matchPackageSubpathImportAlias(alias, candidatePackagePath));

      if (aliasSpecifier === void 0) {
        continue;
      }

      const insideAliasScope =
        currentFilePackagePath !== void 0 &&
        matchPackageSubpathImportAlias(alias, currentFilePackagePath) !==
          void 0;

      if (insideOwnDirectory && insideAliasScope) {
        continue;
      }

      return `${aliasSpecifier}${suffix}`;
    }

    return void 0;
  };
};

export { createPackageSubpathImportMatcher };
