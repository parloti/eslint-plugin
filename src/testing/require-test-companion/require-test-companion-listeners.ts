import type { Rule } from "eslint";

import fs from "node:fs";
import path from "node:path";

import type { RequireTestCompanionState } from "./require-test-companion-options";

import {
  isLintableFilename,
  isPathMatch,
  isTypeScriptFile,
  TYPESCRIPT_EXTENSION,
} from "./require-test-companion-options";

/** Type definition for rule data. */
interface MissingSourceListenerOptions {
  /** Basename field value. */
  basename: string;

  /** Directory field value. */
  directory: string;

  /** Suffix field value. */
  suffix: string;
}

/** Type definition for rule data. */
interface MissingTestListenerOptions {
  /** Basename field value. */
  basename: string;

  /** Directory field value. */
  directory: string;

  /** TestSuffixes field value. */
  testSuffixes: string[];
}

/**
 * Gets the test suffix for a file name when present.
 * @param basename Input basename value.
 * @param testSuffixes Input testSuffixes value.
 * @returns Matched test suffix when present.
 * @example
 * ```typescript
 * const suffix = getTestSuffix("feature.spec.ts", ["spec"]);
 * ```
 */
const getTestSuffix = (
  basename: string,
  testSuffixes: string[],
): string | undefined =>
  testSuffixes.find((suffix) =>
    basename.endsWith(`.${suffix}${TYPESCRIPT_EXTENSION}`),
  );

/**
 * Checks for any test companion file in the directory.
 * @param directory Input directory value.
 * @param baseStem Input baseStem value.
 * @param testSuffixes Input testSuffixes value.
 * @returns True when any test companion exists.
 * @example
 * ```typescript
 * const ok = hasAnyTestCompanion(dir, "feature", ["spec"]);
 * ```
 */
const hasAnyTestCompanion = (
  directory: string,
  baseStem: string,
  testSuffixes: string[],
): boolean =>
  testSuffixes.some((suffix) =>
    fs.existsSync(path.join(directory, `${baseStem}.${suffix}.ts`)),
  );

/**
 * Builds a listener that reports missing test companions.
 * @param context Input context value.
 * @param options Input options value.
 * @returns Rule listener for missing tests.
 * @example
 * ```typescript
 * const listener = buildMissingTestListener(context, options);
 * ```
 */
const buildMissingTestListener = (
  context: Rule.RuleContext,
  options: MissingTestListenerOptions,
): Rule.RuleListener => {
  const { basename, directory, testSuffixes } = options;
  const baseStem = basename.slice(0, -TYPESCRIPT_EXTENSION.length);

  if (baseStem.length === 0) {
    return {};
  }

  if (hasAnyTestCompanion(directory, baseStem, testSuffixes)) {
    return {};
  }

  return {
    Program(node): void {
      const testFiles = testSuffixes
        .map((suffix) => `${baseStem}.${suffix}${TYPESCRIPT_EXTENSION}`)
        .join(", ");

      context.report({
        data: { testFiles },
        messageId: "missingTest",
        node,
      });
    },
  };
};

/**
 * Builds a listener that reports missing source files.
 * @param context Input context value.
 * @param options Input options value.
 * @returns Rule listener for missing sources.
 * @example
 * ```typescript
 * const listener = buildMissingSourceListener(context, options);
 * ```
 */
const buildMissingSourceListener = (
  context: Rule.RuleContext,
  options: MissingSourceListenerOptions,
): Rule.RuleListener => {
  const { basename, directory, suffix } = options;
  const sourceBasename = basename.slice(
    0,
    -`.${suffix}${TYPESCRIPT_EXTENSION}`.length,
  );

  if (sourceBasename.length === 0) {
    return {};
  }

  const sourceFile = `${sourceBasename}${TYPESCRIPT_EXTENSION}`;

  if (fs.existsSync(path.join(directory, sourceFile))) {
    return {};
  }

  return {
    Program(node): void {
      context.report({
        data: { sourceFile },
        messageId: "missingSource",
        node,
      });
    },
  };
};

/**
 * Determines whether a file should be linted.
 * @param filename Input filename value.
 * @param options Input options value.
 * @returns True when the file should be linted.
 * @example
 * ```typescript
 * const ok = shouldLintFile(filename, options);
 * ```
 */
const shouldLintFile = (
  filename: string,
  options: RequireTestCompanionState,
): boolean => {
  const { enforceIn, ignorePatterns } = options;

  if (!isLintableFilename(filename)) {
    return false;
  }

  if (!isTypeScriptFile(filename)) {
    return false;
  }

  if (!isPathMatch(filename, enforceIn)) {
    return false;
  }

  return !isPathMatch(filename, ignorePatterns);
};

/**
 * Builds a listener for a specific filename.
 * @param context Input context value.
 * @param filename Input filename value.
 * @param options Input options value.
 * @returns Rule listener for the filename.
 * @example
 * ```typescript
 * const listener = buildListenerForFilename(context, filename, options);
 * ```
 */
const buildListenerForFilename = (
  context: Rule.RuleContext,
  filename: string,
  options: RequireTestCompanionState,
): Rule.RuleListener => {
  if (!shouldLintFile(filename, options)) {
    return {};
  }

  const basename = path.basename(filename);
  const directory = path.dirname(filename);
  const { testSuffixes } = options;
  const testSuffix = getTestSuffix(basename, testSuffixes);

  if (testSuffix !== void 0) {
    return buildMissingSourceListener(context, {
      basename,
      directory,
      suffix: testSuffix,
    });
  }

  return buildMissingTestListener(context, {
    basename,
    directory,
    testSuffixes,
  });
};

export { buildListenerForFilename };
