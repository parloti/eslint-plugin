import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createPackageSubpathImportMatcher } from "../package-subpath-import-utilities";

/**
 * Runs one callback inside a temporary directory containing the supplied files.
 * @param files POSIX-relative file paths and contents.
 * @param callback Operation receiving the temporary root path.
 * @returns Callback return value.
 * @example
 * ```typescript
 * withTemporaryFiles({ "package.json": "{}" }, (root) => root);
 * ```
 */
const withTemporaryFiles = <Result>(
  files: Readonly<Record<string, string>>,
  callback: (temporaryRoot: string) => Result,
): Result => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), "package-imports-"));

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(temporaryRoot, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, "utf8");
  }

  try {
    return callback(temporaryRoot);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

/**
 * Builds package.json contents for matcher tests.
 * @param value Value assigned to the imports field.
 * @returns Serialized package.json contents.
 * @example
 * ```typescript
 * const packageJson = createPackageJson({ "#src/*": "./src/*" });
 * ```
 */
const createPackageJson = (value: unknown): string =>
  JSON.stringify({ imports: value });

/**
 * Matches one relative specifier inside a temporary package project.
 * @param files Temporary package files keyed by POSIX-relative paths.
 * @param filename POSIX-relative linted filename.
 * @param sourceSpecifier Module specifier to match.
 * @returns Preferred package import alias or undefined.
 * @example
 * ```typescript
 * matchPackageImport(files, "src/feature.ts", "./feature");
 * ```
 */
const matchPackageImport = (
  files: Readonly<Record<string, string>>,
  filename: string,
  sourceSpecifier: string,
): string | undefined =>
  withTemporaryFiles(files, (temporaryRoot) => {
    const matchAlias = createPackageSubpathImportMatcher(
      path.join(temporaryRoot, filename),
      temporaryRoot,
    );

    return matchAlias(sourceSpecifier);
  });

export { createPackageJson, matchPackageImport, withTemporaryFiles };
