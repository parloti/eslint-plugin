import { afterAll, describe, expect, it } from "vitest";

import { consistentBarrelFilesRule } from "../../src";
import { createTemporaryFixtureManager, runRuleCase } from "../support";

describe("consistent-barrel-files e2e", () => {
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
  const customNamedBarrel = createFixtureSet({
    "feature.ts": "export const feature = 1;",
    "mod.ts": 'export * from "./feature";',
  });
  const declarationNamedBarrel = createFixtureSet({
    "feature.ts": "export const feature = 1;",
    "index.d.ts": "export interface FeatureDeclaration {}",
  });
  const barrelOnlyFolder = createFixtureSet({
    "index.ts": 'export * from "./feature";',
  });

  it.each([
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
  ])("rejects missing or forbidden barrels %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "consistent-barrel-files",
      consistentBarrelFilesRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
  });

  it.each([
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
  ])("accepts configured barrel layouts %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "consistent-barrel-files",
      consistentBarrelFilesRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
