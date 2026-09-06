import type { ExportedElement } from "../types";

import { getOptions } from "../no-unused-exports-options";
import { collectCrossFileUsages } from "../no-unused-exports-usage-utilities";
import { withTemporaryProject } from "./no-unused-exports-utilities-test-helpers";

/** Relative file contents composing the value-export fixture project. */
const VALUE_FIXTURE_FILES = {
  "packages/pkg/src/consumer.ts": [
    "import featureDefault, { feature } from './feature';",
    "import { unrelated } from './other';",
    "void featureDefault;",
    "void feature;",
    "void unrelated;",
  ].join("\n"),
  "packages/pkg/src/exporter.ts": [
    "import { feature } from './feature';",
    "export { feature };",
  ].join("\n"),
  "packages/pkg/src/feature.ts":
    "export const feature = 1;\nexport default feature;\n",
  "packages/pkg/src/import-only.ts": "import { feature } from './feature';\n",
  "packages/pkg/src/label.ts": "feature: void 0;\n",
  "packages/pkg/src/missing.ts": "feature;\n",
  "packages/pkg/src/other.ts": "export const unrelated = 1;\n",
  "packages/pkg/tests/feature.spec.ts":
    "import { feature } from '../src/feature';\nvoid feature;\n",
};

/** Relative file contents composing the type-export fixture project. */
const TYPE_FIXTURE_FILES = {
  "src/consumer.ts": [
    "import type { Alias } from './feature';",
    "const value: Alias = { id: 'x' };",
    "void value;",
  ].join("\n"),
  "src/feature.ts": "export type Alias = { readonly id: string };\n",
  "tests/feature.spec.ts": [
    "import type { Alias } from '../src/feature';",
    "type Local = Alias;",
  ].join("\n"),
};

/** Relative file contents composing the shorthand-property fixture project. */
const SHORTHAND_FIXTURE_FILES = {
  "src/barrel.ts": "export { buildFeature } from './feature';\n",
  "src/consumer.ts":
    [
      "import { buildFeature } from './barrel';",
      "function configure(opts: { buildFeature: (x: string) => string }): void { void opts; }",
      "configure({ buildFeature });",
    ].join("\n") + "\n",
  "src/feature.ts":
    "function buildFeature(x: string): string { return x; }\nexport { buildFeature };\n",
};

/** Relative file contents composing the `typeof` usage fixture project. */
const TYPEOF_FIXTURE_FILES = {
  "src/consumer.ts": [
    "import { feature } from './feature';",
    "export type FeatureShape = typeof feature;",
  ].join("\n"),
  "src/feature.ts": "export const feature = { id: 1 } as const;\n",
};

/** Relative file contents composing the mixed consumer fixture project. */
const MIXED_CONSUMER_FIXTURE_FILES = {
  "src/consumer.ts": [
    "import { feature } from './feature';",
    "void feature.id;",
  ].join("\n"),
  "src/feature.ts": "export const feature = { id: 1 } as const;\n",
  "src/index.ts": "export { feature } from './feature';\n",
  "src/shadow.ts": ["const feature = 1;", "void feature;"].join("\n"),
  "src/type-consumer.ts": [
    "import { feature } from './feature';",
    "export type FeatureShape = typeof feature;",
  ].join("\n"),
  "tests/feature.spec.ts": [
    "import { feature } from '../src/feature';",
    "void feature.id;",
  ].join("\n"),
};

/** Exported value element describing the `feature` fixture export. */
const EXPORTED_FEATURE_VALUE_ELEMENT: ExportedElement = {
  exportedName: "feature",
  exportKind: "value",
  node: { type: "ExportNamedDeclaration" } as never,
};

/** Exported type element describing the `Alias` fixture export. */
const EXPORTED_ALIAS_TYPE_ELEMENT: ExportedElement = {
  exportedName: "Alias",
  exportKind: "type",
  node: { type: "ExportNamedDeclaration" } as never,
};

/**
 * Builds one temporary project and collects concrete usages for one exported value.
 * @returns Collected usages for `feature` export.
 * @example
 * ```typescript
 * const usages = collectValueFixtureUsages();
 * ```
 */
const collectValueFixtureUsages = () =>
  withTemporaryProject(
    "no-unused-exports-",
    VALUE_FIXTURE_FILES,
    (temporaryRoot, program, resolvePath) => {
      const state = getOptions([
        { testFilePatterns: ["tests/**/*.ts", "**/*.spec.ts"] },
      ]);

      return collectCrossFileUsages(
        program,
        resolvePath("packages/pkg/src/feature.ts"),
        state,
        temporaryRoot,
        EXPORTED_FEATURE_VALUE_ELEMENT,
      );
    },
  );

/**
 * Builds one temporary project and collects concrete usages for one exported type.
 * @returns Collected usages for `Alias` export.
 * @example
 * ```typescript
 * const usages = collectTypeFixtureUsages();
 * ```
 */
const collectTypeFixtureUsages = () =>
  withTemporaryProject(
    "no-unused-types-",
    TYPE_FIXTURE_FILES,
    (temporaryRoot, program, resolvePath) => {
      const state = getOptions([
        { testFilePatterns: ["tests/**/*.ts", "**/*.spec.ts"] },
      ]);

      return collectCrossFileUsages(
        program,
        resolvePath("src/feature.ts"),
        state,
        temporaryRoot,
        EXPORTED_ALIAS_TYPE_ELEMENT,
      );
    },
  );

/**
 * Builds one temporary project whose only consumer uses `typeof` on the export.
 * @returns Collected usages for the `feature` value export.
 * @example
 * ```typescript
 * const usages = collectTypeofValueFixtureUsages();
 * ```
 */
const collectTypeofValueFixtureUsages = () =>
  withTemporaryProject(
    "no-unused-typeof-",
    TYPEOF_FIXTURE_FILES,
    (temporaryRoot, program, resolvePath) =>
      collectCrossFileUsages(
        program,
        resolvePath("src/feature.ts"),
        getOptions([]),
        temporaryRoot,
        EXPORTED_FEATURE_VALUE_ELEMENT,
      ),
  );

/**
 * Builds one temporary project where the only consumer uses the export as a
 * shorthand property value through a multi-level barrel chain.
 * @returns Collected usages for the `buildFeature` value export.
 * @example
 * ```typescript
 * const usages = collectShorthandPropertyFixtureUsages();
 * ```
 */
const collectShorthandPropertyFixtureUsages = () =>
  withTemporaryProject(
    "no-unused-shorthand-",
    SHORTHAND_FIXTURE_FILES,
    (temporaryRoot, program, resolvePath) =>
      collectCrossFileUsages(
        program,
        resolvePath("src/feature.ts"),
        getOptions([]),
        temporaryRoot,
        {
          exportedName: "buildFeature",
          exportKind: "value",
          node: { type: "ExportNamedDeclaration" } as never,
        },
      ),
  );

export {
  collectShorthandPropertyFixtureUsages,
  collectTypeFixtureUsages,
  collectTypeofValueFixtureUsages,
  collectValueFixtureUsages,
  EXPORTED_FEATURE_VALUE_ELEMENT,
  MIXED_CONSUMER_FIXTURE_FILES,
};
