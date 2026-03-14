import { afterAll } from "vitest";

import { barrelFilesExportsOnlyRule } from "../../src";

import { createRuleTester } from "./rule-tester";
import { createTemporaryFixtureManager } from "./temporary-fixtures";

const ruleTester = createRuleTester();
const { cleanupTemporaryDirectories, createFixtureSet } =
  createTemporaryFixtureManager();

afterAll(cleanupTemporaryDirectories);

const emptyBarrel = createFixtureSet({ "index.ts": "" });
const validBarrel = createFixtureSet({
  "index.ts": [
    'export * from "./feature";',
    'export { feature } from "./feature";',
  ].join("\n"),
});
const invalidBarrel = createFixtureSet({
  "index.ts": [
    'import { feature } from "./feature";',
    "export { feature };",
  ].join("\n"),
});
const nonBarrel = createFixtureSet({
  "feature.ts": 'import { feature } from "./dependency";',
});

ruleTester.run("barrel-files-exports-only", barrelFilesExportsOnlyRule, {
  invalid: [
    {
      code: [
        'import { feature } from "./feature";',
        "export { feature };",
      ].join("\n"),
      errors: [{ messageId: "invalidBarrelContent" }],
      filename: invalidBarrel.getFilePath("index.ts"),
      options: [{ folders: invalidBarrel.folderGlobs }],
    },
  ],
  valid: [
    {
      code: "",
      filename: emptyBarrel.getFilePath("index.ts"),
      options: [{ folders: emptyBarrel.folderGlobs }],
    },
    {
      code: [
        'export * from "./feature";',
        'export { feature } from "./feature";',
      ].join("\n"),
      filename: validBarrel.getFilePath("index.ts"),
      options: [{ folders: validBarrel.folderGlobs }],
    },
    {
      code: 'import { feature } from "./dependency";',
      filename: nonBarrel.getFilePath("feature.ts"),
      options: [{ folders: nonBarrel.folderGlobs }],
    },
  ],
});
