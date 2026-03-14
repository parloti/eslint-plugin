import { afterAll } from "vitest";

import { noReexportsOutsideBarrelsRule } from "../../src";

import { createRuleTester } from "./rule-tester";
import { createTemporaryFixtureManager } from "./temporary-fixtures";

const ruleTester = createRuleTester();
const { cleanupTemporaryDirectories, createFixtureSet } =
  createTemporaryFixtureManager();

afterAll(cleanupTemporaryDirectories);

const barrelFile = createFixtureSet({
  "index.ts": 'export * from "./feature";',
});
const exportFromFile = createFixtureSet({
  "feature.ts": 'export * from "./dependency";',
});
const importedExportFile = createFixtureSet({
  "feature.ts": [
    'import { feature } from "./dependency";',
    "export { feature };",
  ].join("\n"),
});
const localExportFile = createFixtureSet({
  "feature.ts": "export const feature = 1;",
});

ruleTester.run("no-reexports-outside-barrels", noReexportsOutsideBarrelsRule, {
  invalid: [
    {
      code: 'export * from "./dependency";',
      errors: [{ messageId: "reexportNotAllowed" }],
      filename: exportFromFile.getFilePath("feature.ts"),
      options: [{ folders: exportFromFile.folderGlobs }],
    },
    {
      code: [
        'import { feature } from "./dependency";',
        "export { feature };",
      ].join("\n"),
      errors: [{ messageId: "reexportedImport" }],
      filename: importedExportFile.getFilePath("feature.ts"),
      options: [{ folders: importedExportFile.folderGlobs }],
    },
  ],
  valid: [
    {
      code: 'export * from "./feature";',
      filename: barrelFile.getFilePath("index.ts"),
      options: [{ folders: barrelFile.folderGlobs }],
    },
    {
      code: "export const feature = 1;",
      filename: localExportFile.getFilePath("feature.ts"),
      options: [{ folders: localExportFile.folderGlobs }],
    },
  ],
});
