/** Shared fixture constants for the no-unused-exports end-to-end suite. */

/** Rule options configuring a custom public API file glob. */
const customPublicApiFilesOptions = {
  publicApiFiles: ["**/src/public-api.ts"],
};

/** Source of a production module that imports and uses the feature export. */
const productionFeatureUsageSource = [
  'import { feature } from "./feature";',
  "console.log(feature);",
].join("\n");

/** Source of a spec module that imports the feature export without using it. */
const testOnlyFeatureUsageSource = [
  'import { feature } from "./feature";',
  "void feature;",
].join("\n");

/** Source of a module that imports through the re-export without using it. */
const testOnlyReexportUsageSource = [
  'import { feature } from "./reexport";',
  "void feature;",
].join("\n");

/** Compiler configuration fixture written into every temporary project. */
const temporaryProjectTsconfig = JSON.stringify(
  {
    compilerOptions: {
      module: "esnext",
      moduleResolution: "bundler",
      noEmit: true,
      strict: true,
      target: "esnext",
    },
    include: ["**/*.ts"],
  },
  void 0,
  2,
);

/** Companion marker for test isolation. */
export {
  customPublicApiFilesOptions,
  productionFeatureUsageSource,
  temporaryProjectTsconfig,
  testOnlyFeatureUsageSource,
  testOnlyReexportUsageSource,
};
