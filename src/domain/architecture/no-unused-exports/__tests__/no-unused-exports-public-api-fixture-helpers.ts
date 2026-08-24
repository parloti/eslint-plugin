import { getOptions } from "../no-unused-exports-options";
import { collectCrossFileUsages } from "../no-unused-exports-usage-utilities";
import { EXPORTED_FEATURE_VALUE_ELEMENT } from "./no-unused-exports-usage-fixture-helpers";
import { withTemporaryProject } from "./no-unused-exports-utilities-test-helpers";

/** Relative file contents composing the forwarding-only fixture project. */
const FORWARDING_ONLY_FIXTURE_FILES = {
  "src/barrel.ts": "export { feature } from './feature';\n",
  "src/feature.ts": "export const feature = 1;\n",
};

/** Relative file contents composing the public API exposure fixture project. */
const PUBLIC_API_EXPOSURE_FIXTURE_FILES = {
  "packages/other/src/index.ts": "export const other = 1;\n",
  "packages/pkg/src/empty.ts": "\n",
  "packages/pkg/src/feature.ts": "export const feature = 1;\n",
  "packages/pkg/src/index.ts": "export { feature } from './infrastructure';\n",
  "packages/pkg/src/infrastructure.ts":
    "export { feature } from './feature';\n",
};

/** Relative file contents composing the empty public API fixture project. */
const EMPTY_PUBLIC_API_FIXTURE_FILES = {
  "src/empty.ts": "const placeholder = 1;\n",
  "src/feature.ts": "export const feature = 1;\n",
};

/** Relative file contents composing the other-symbol public API fixture. */
const OTHER_PUBLIC_API_FIXTURE_FILES = {
  "src/feature.ts": "export const feature = 1;\n",
  "src/index.ts": "export const other = 1;\n",
};

/**
 * Builds one temporary project whose export is only forwarded by a regular file.
 * @returns Collected usages for the forwarded `feature` export.
 * @example
 * ```typescript
 * const usages = collectForwardingOnlyFixtureUsages();
 * ```
 */
const collectForwardingOnlyFixtureUsages = () =>
  withTemporaryProject(
    "no-unused-forwarding-",
    FORWARDING_ONLY_FIXTURE_FILES,
    (temporaryRoot, program, resolvePath) => {
      const state = getOptions([
        {
          publicApiFiles: ["src/index.ts", "src/other-index.ts"],
        },
      ]);

      return collectCrossFileUsages(
        program,
        resolvePath("src/feature.ts"),
        state,
        temporaryRoot,
        EXPORTED_FEATURE_VALUE_ELEMENT,
      );
    },
  );

/**
 * Builds one temporary project whose export is exposed through the public API.
 * @returns Collected usages for the public `feature` export.
 * @example
 * ```typescript
 * const usages = collectPublicApiFixtureUsages();
 * ```
 */
const collectPublicApiExposureFixtureUsages = () =>
  withTemporaryProject(
    "no-unused-public-api-",
    PUBLIC_API_EXPOSURE_FIXTURE_FILES,
    (temporaryRoot, program, resolvePath) =>
      collectCrossFileUsages(
        program,
        resolvePath("packages/pkg/src/feature.ts"),
        getOptions([
          {
            publicApiFiles: [
              "packages/pkg/src/empty.ts",
              "packages/pkg/src/index.ts",
              "packages/other/src/index.ts",
            ],
          },
        ]),
        temporaryRoot,
        EXPORTED_FEATURE_VALUE_ELEMENT,
      ),
  );

/**
 * Builds one temporary project with one public API file without exports.
 * @returns Collected usages for the `feature` export.
 * @example
 * ```typescript
 * const usages = collectEmptyPublicApiFixtureUsages();
 * ```
 */
const collectEmptyPublicApiFixtureUsages = () =>
  withTemporaryProject(
    "no-unused-empty-public-api-",
    EMPTY_PUBLIC_API_FIXTURE_FILES,
    (temporaryRoot, program, resolvePath) => {
      const state = getOptions([
        {
          publicApiFiles: ["src/empty.ts"],
        },
      ]);

      return collectCrossFileUsages(
        program,
        resolvePath("src/feature.ts"),
        state,
        temporaryRoot,
        EXPORTED_FEATURE_VALUE_ELEMENT,
      );
    },
  );

/**
 * Builds one temporary project whose public API exports other symbols.
 * @returns Collected usages for the `feature` export.
 * @example
 * ```typescript
 * const usages = collectOtherPublicApiFixtureUsages();
 * ```
 */
const collectOtherPublicApiFixtureUsages = () =>
  withTemporaryProject(
    "no-unused-other-public-api-",
    OTHER_PUBLIC_API_FIXTURE_FILES,
    (temporaryRoot, program, resolvePath) => {
      const state = getOptions([
        {
          publicApiFiles: ["src/index.ts"],
        },
      ]);

      return collectCrossFileUsages(
        program,
        resolvePath("src/feature.ts"),
        state,
        temporaryRoot,
        EXPORTED_FEATURE_VALUE_ELEMENT,
      );
    },
  );

export {
  collectEmptyPublicApiFixtureUsages,
  collectForwardingOnlyFixtureUsages,
  collectOtherPublicApiFixtureUsages,
  collectPublicApiExposureFixtureUsages,
};
