import { afterAll } from "vitest";

import { consistentBarrelFilesRule } from "../../src";
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
const validFeature = createFixtureSet({
  "feature.ts": "export const feature = 1;",
  "index.ts": 'export * from "./feature";',
});

/**
 *
 */
const missingBarrel = createFixtureSet({
  "feature.ts": "export const feature = 1;",
});

/**
 *
 */
const forbiddenBarrel = createFixtureSet({
  "feature.ts": "export const feature = 1;",
  "index.ts": 'export * from "./feature";',
});

/**
 *
 */
const customNamedBarrel = createFixtureSet({
  "feature.ts": "export const feature = 1;",
  "mod.ts": 'export * from "./feature";',
});

/**
 *
 */
const declarationNamedBarrel = createFixtureSet({
  "feature.ts": "export const feature = 1;",
  "index.d.ts": "export interface FeatureDeclaration {}",
});

/**
 *
 */
const barrelOnlyFolder = createFixtureSet({
  "index.ts": 'export * from "./feature";',
});

ruleTester.run("consistent-barrel-files", consistentBarrelFilesRule, {
  invalid: [
    {
      code: "export const feature = 1;",
      errors: [{ messageId: "missingBarrel" }],
      filename: missingBarrel.getFilePath("feature.ts"),
    },
    {
      code: 'export * from "./feature";',
      errors: [{ messageId: "forbiddenBarrel" }],
      filename: forbiddenBarrel.getFilePath("index.ts"),
      options: [{ enforce: false }],
    },
    {
      code: "export const feature = 1;",
      errors: [{ messageId: "missingBarrel" }],
      filename: declarationNamedBarrel.getFilePath("feature.ts"),
    },
  ],
  valid: [
    {
      code: "export const feature = 1;",
      filename: validFeature.getFilePath("feature.ts"),
    },
    {
      code: "export const feature = 1;",
      filename: customNamedBarrel.getFilePath("feature.ts"),
      options: [{ allowedNames: ["mod"] }],
    },
    {
      code: 'export * from "./feature";',
      filename: barrelOnlyFolder.getFilePath("index.ts"),
      options: [{ enforce: false }],
    },
  ],
});
