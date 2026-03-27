import { afterAll } from "vitest";

import { barrelFilesExportsOnlyRule } from "../../src";
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
const emptyBarrel = createFixtureSet({ "index.ts": "" });

/**
 *
 */
const validBarrel = createFixtureSet({
  "index.ts": [
    'export * from "./feature";',
    'export { feature } from "./feature";',
  ].join("\n"),
});

/**
 *
 */
const typeOnlyBarrel = createFixtureSet({
  "index.ts": [
    "export interface Feature {",
    "  readonly name: string;",
    "}",
    "export type FeatureName = string;",
  ].join("\n"),
});

/**
 *
 */
const invalidBarrel = createFixtureSet({
  "index.ts": [
    'import { feature } from "./feature";',
    "export { feature };",
  ].join("\n"),
});

/**
 *
 */
const customBarrel = createFixtureSet({
  "mod.ts": [
    'import { feature } from "./feature";',
    "export { feature };",
  ].join("\n"),
});

/**
 *
 */
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
    },
    {
      code: ["export const value = 1;", 'console.log("loaded");'].join("\n"),
      errors: [{ messageId: "invalidBarrelContent" }],
      filename: invalidBarrel.getFilePath("index.ts"),
    },
    {
      code: [
        'import { feature } from "./feature";',
        "export { feature };",
      ].join("\n"),
      errors: [{ messageId: "invalidBarrelContent" }],
      filename: customBarrel.getFilePath("mod.ts"),
      options: [{ allowedBarrelNames: ["mod"] }],
    },
  ],
  valid: [
    {
      code: "",
      filename: emptyBarrel.getFilePath("index.ts"),
    },
    {
      code: [
        'export * from "./feature";',
        'export { feature } from "./feature";',
      ].join("\n"),
      filename: validBarrel.getFilePath("index.ts"),
    },
    {
      code: [
        "export interface Feature {",
        "  readonly name: string;",
        "}",
        "export type FeatureName = string;",
      ].join("\n"),
      filename: typeOnlyBarrel.getFilePath("index.ts"),
    },
    {
      code: 'import { feature } from "./dependency";',
      filename: nonBarrel.getFilePath("feature.ts"),
    },
    {
      code: [
        "export interface Feature {",
        "  readonly name: string;",
        "}",
        "export type FeatureName = string;",
      ].join("\n"),
      filename: customBarrel.getFilePath("mod.ts"),
      options: [{ allowedBarrelNames: ["mod"] }],
    },
  ],
});
