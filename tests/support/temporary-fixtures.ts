import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";

/** Fixture files and paths created for one temporary project. */
interface FixtureSet {
  /** Temporary fixture directory path. */
  directory: string;

  /** Absolute file paths keyed by their original relative names. */
  filePaths: Record<string, string>;

  /** Folder glob rooted at the temporary fixture directory. */
  folderGlob: string;

  /** Reusable list form of the fixture folder glob. */
  folderGlobs: string[];

  /**
   * Resolves one created fixture file.
   * @param relativePath Relative path supplied when the fixture set was created.
   * @returns Absolute path for the requested fixture file.
   */
  getFilePath: (relativePath: string) => string;
}

/** Helpers for creating and cleaning up temporary fixture projects. */
interface TemporaryFixtureManager {
  /** Removes all temporary directories created by this manager. */
  cleanupTemporaryDirectories: () => void;

  /**
   * Creates one temporary fixture project.
   * @param files Relative file paths and contents to write.
   * @param root Workspace root folder to create the fixture under.
   * @returns Metadata for the created fixture set.
   */
  createFixtureSet: (
    files: Record<string, string>,
    root?: "src" | "tmp",
  ) => FixtureSet;
}

/**
 * Normalizes one filesystem path to POSIX separators.
 * @param filePath Filesystem path to normalize.
 * @returns Normalized POSIX path.
 * @example
 * ```typescript
 * const posixPath = toPosixPath("tmp\\example.ts");
 * void posixPath;
 * ```
 */
const toPosixPath = (filePath: string): string =>
  filePath.split(path.sep).join("/");

/**
 * Creates the temporary fixture manager used by the e2e suites.
 * @returns Temporary fixture manager with isolated directory tracking.
 * @example
 * ```typescript
 * const fixtureManager = createTemporaryFixtureManager();
 * void fixtureManager;
 * ```
 */
const createTemporaryFixtureManager = (): TemporaryFixtureManager => {
  const temporaryDirectories: string[] = [];

  const createFixtureSet = (
    files: Record<string, string>,
    root: "src" | "tmp" = "tmp",
  ): FixtureSet => {
    const baseDirectory = path.join(cwd(), root);
    mkdirSync(baseDirectory, { recursive: true });

    const directory = mkdtempSync(path.join(baseDirectory, "e2e-"));
    temporaryDirectories.push(directory);

    const filePaths = Object.fromEntries(
      Object.entries(files).map(([relativePath, content]) => {
        const filePath = path.join(directory, relativePath);
        mkdirSync(path.dirname(filePath), { recursive: true });
        writeFileSync(filePath, content, "utf8");
        return [relativePath, filePath];
      }),
    );

    const folderGlob = `${toPosixPath(path.relative(cwd(), directory))}/**`;
    const getFilePath = (relativePath: string): string => {
      const filePath = filePaths[relativePath];

      if (filePath === void 0) {
        throw new Error(`Missing fixture file path for ${relativePath}.`);
      }

      return filePath;
    };

    return {
      directory,
      filePaths,
      folderGlob,
      folderGlobs: [folderGlob],
      getFilePath,
    };
  };

  const cleanupTemporaryDirectories = (): void => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  };

  return { cleanupTemporaryDirectories, createFixtureSet };
};

export { createTemporaryFixtureManager };
export type { FixtureSet, TemporaryFixtureManager };
