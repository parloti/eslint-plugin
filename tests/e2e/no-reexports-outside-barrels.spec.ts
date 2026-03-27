import { afterAll } from "vitest";

import { noReexportsOutsideBarrelsRule } from "../../src";
import { createRuleTester } from "../support/rule-tester";
import { createTemporaryFixtureManager } from "../support/temporary-fixtures";

/**
 *
 */
const ruleTester = createRuleTester();

/**
 *
 */
const { cleanupTemporaryDirectories, createFixtureSet } =
  createTemporaryFixtureManager();

afterAll(cleanupTemporaryDirectories);

/**
 *
 */
const barrelFile = createFixtureSet({
  "index.ts": 'export * from "./feature";',
});

/**
 *
 */
const exportFromFile = createFixtureSet({
  "feature.ts": 'export * from "./dependency";',
});

/**
 *
 */
const importedExportFile = createFixtureSet({
  "feature.ts": [
    'import { feature } from "./dependency";',
    "export { feature };",
  ].join("\n"),
});

/**
 *
 */
const localExportFile = createFixtureSet({
  "feature.ts": "export const feature = 1;",
});

/**
 *
 */
const customBarrelFile = createFixtureSet({
  "mod.ts": 'export * from "./feature";',
});

ruleTester.run("no-reexports-outside-barrels", noReexportsOutsideBarrelsRule, {
  invalid: [
    {
      code: 'export * from "./dependency";',
      errors: [{ messageId: "reexportNotAllowed" }],
      filename: exportFromFile.getFilePath("feature.ts"),
    },
    {
      code: [
        'import { feature } from "./dependency";',
        "export { feature };",
      ].join("\n"),
      errors: [{ messageId: "reexportedImport" }],
      filename: importedExportFile.getFilePath("feature.ts"),
    },
  ],
  valid: [
    {
      code: 'export * from "./feature";',
      filename: barrelFile.getFilePath("index.ts"),
    },
    {
      code: 'export * from "./feature";',
      filename: customBarrelFile.getFilePath("mod.ts"),
      options: [{ allowedBarrelNames: ["mod"] }],
    },
    {
      code: "export const feature = 1;",
      filename: localExportFile.getFilePath("feature.ts"),
    },
  ],
});
