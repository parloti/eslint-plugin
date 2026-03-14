import { afterAll } from "vitest";

import { consistentBarrelFilesRule } from "../../src";

import { createRuleTester } from "./rule-tester";
import { createTemporaryFixtureManager } from "./temporary-fixtures";

const ruleTester = createRuleTester();
const { cleanupTemporaryDirectories, createFixtureSet } =
  createTemporaryFixtureManager();

afterAll(cleanupTemporaryDirectories);

const validFeature = createFixtureSet({
  "feature.ts": "export const feature = 1;",
  "index.ts": 'export * from "./feature";',
});
const missingBarrel = createFixtureSet({
  "feature.ts": "export const feature = 1;",
});
const forbiddenBarrel = createFixtureSet({
  "feature.ts": "export const feature = 1;",
  "index.ts": 'export * from "./feature";',
});

ruleTester.run("consistent-barrel-files", consistentBarrelFilesRule, {
  invalid: [
    {
      code: "export const feature = 1;",
      errors: [{ messageId: "missingBarrel" }],
      filename: missingBarrel.getFilePath("feature.ts"),
      options: [{ folders: missingBarrel.folderGlobs }],
    },
    {
      code: 'export * from "./feature";',
      errors: [{ messageId: "forbiddenBarrel" }],
      filename: forbiddenBarrel.getFilePath("index.ts"),
      options: [{ enforce: false, folders: forbiddenBarrel.folderGlobs }],
    },
  ],
  valid: [
    {
      code: "export const feature = 1;",
      filename: validFeature.getFilePath("feature.ts"),
      options: [{ folders: validFeature.folderGlobs }],
    },
  ],
});
