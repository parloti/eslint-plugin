import { afterAll } from "vitest";

import { requireTestCompanionRule } from "../../src";

import { createRuleTester } from "../support/rule-tester";
import { createTemporaryFixtureManager } from "../support/temporary-fixtures";

const ruleTester = createRuleTester();
const { cleanupTemporaryDirectories, createFixtureSet } =
  createTemporaryFixtureManager();

afterAll(cleanupTemporaryDirectories);

const sourceWithTest = createFixtureSet({
  "feature.spec.ts": "export {};",
  "feature.ts": "export const feature = 1;",
});
const sourceWithoutTest = createFixtureSet({
  "feature.ts": "export const feature = 1;",
});
const testWithoutSource = createFixtureSet({
  "feature.test.ts": "export {};",
});

ruleTester.run("require-test-companion", requireTestCompanionRule, {
  invalid: [
    {
      code: "export const feature = 1;",
      errors: [{ messageId: "missingTest" }],
      filename: sourceWithoutTest.getFilePath("feature.ts"),
      options: [{ enforceIn: sourceWithoutTest.folderGlobs }],
    },
    {
      code: "export {};",
      errors: [{ messageId: "missingSource" }],
      filename: testWithoutSource.getFilePath("feature.test.ts"),
      options: [{ enforceIn: testWithoutSource.folderGlobs }],
    },
  ],
  valid: [
    {
      code: "export const feature = 1;",
      filename: sourceWithTest.getFilePath("feature.ts"),
      options: [{ enforceIn: sourceWithTest.folderGlobs }],
    },
    {
      code: "export {};",
      filename: sourceWithTest.getFilePath("feature.spec.ts"),
      options: [{ enforceIn: sourceWithTest.folderGlobs }],
    },
  ],
});
