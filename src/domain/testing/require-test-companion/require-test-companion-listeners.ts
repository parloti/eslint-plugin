import type { Rule } from "eslint";

import { existsSync } from "node:fs";
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
  /** Directory field value. */
  directory: string;

  /** Basename field value. */
  fileBasename: string;

  /** Suffix field value. */
  suffix: string;
}

/**
 * Gets the test suffix for a file name when present.
 * @param fileBasename Input basename value.
 * @param testSuffixes Input testSuffixes value.
 * @returns Matched test suffix when present.
 * @example
 * ```typescript
 * const suffix = getTestSuffix("feature.spec.ts", ["spec"]);
 * ```
 */
const getTestSuffix = (
  fileBasename: string,
  testSuffixes: string[],
): string | undefined =>
  testSuffixes.find((suffix) =>
    fileBasename.endsWith(`.${suffix}${TYPESCRIPT_EXTENSION}`),
  );

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
  const { directory, fileBasename, suffix } = options;
  const sourceBasename = fileBasename.slice(
    0,
    -`.${suffix}${TYPESCRIPT_EXTENSION}`.length,
  );

  if (sourceBasename.length === 0) {
    return {};
  }

  const sourceFile = `${sourceBasename}${TYPESCRIPT_EXTENSION}`;

  if (existsSync(path.join(directory, sourceFile))) {
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

  const fileBasename = path.basename(filename);
  const directory = path.dirname(filename);
  const { testSuffixes } = options;
  const testSuffix = getTestSuffix(fileBasename, testSuffixes);

  if (testSuffix === void 0) {
    return {};
  }

  return buildMissingSourceListener(context, {
    directory,
    fileBasename,
    suffix: testSuffix,
  });
};

export { buildListenerForFilename };
