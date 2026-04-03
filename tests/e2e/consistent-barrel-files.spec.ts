import { afterAll, describe, expect, it } from "vitest";

import { consistentBarrelFilesRule } from "../../src";
import { createTemporaryFixtureManager, runRuleCase } from "../support";

describe("consistent-barrel-files e2e", () => {
  const { cleanupTemporaryDirectories, createFixtureSet } =
    createTemporaryFixtureManager();

  afterAll(cleanupTemporaryDirectories);

  const validFeature = createFixtureSet({
    "src/feature.ts": "export const feature = 1;",
    "src/index.ts": 'export * from "./feature";',
  });
  const missingBarrel = createFixtureSet({
    "src/feature.ts": "export const feature = 1;",
  });
  const forbiddenBarrel = createFixtureSet({
    "src/feature.ts": "export const feature = 1;",
    "src/index.ts": 'export * from "./feature";',
  });
  const customNamedBarrel = createFixtureSet({
    "src/feature.ts": "export const feature = 1;",
    "src/mod.ts": 'export * from "./feature";',
  });
  const declarationNamedBarrel = createFixtureSet({
    "src/feature.ts": "export const feature = 1;",
    "src/index.d.ts": "export interface FeatureDeclaration {}",
  });
  const barrelOnlyFolder = createFixtureSet({
    "src/index.ts": 'export * from "./feature";',
  });

  it.each([
    {
      code: "export const feature = 1;",
      errors: [{ messageId: "missingBarrel" }],
      filename: missingBarrel.getFilePath("src/feature.ts"),
    },
    {
      code: 'export * from "./feature";',
      errors: [{ messageId: "forbiddenBarrel" }],
      filename: forbiddenBarrel.getFilePath("src/index.ts"),
      options: [{ enforce: false }],
    },
    {
      code: "export const feature = 1;",
      errors: [{ messageId: "missingBarrel" }],
      filename: declarationNamedBarrel.getFilePath("src/feature.ts"),
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
      filename: validFeature.getFilePath("src/feature.ts"),
    },
    {
      code: "export const feature = 1;",
      filename: customNamedBarrel.getFilePath("src/feature.ts"),
      options: [{ allowedNames: ["mod"] }],
    },
    {
      code: 'export * from "./feature";',
      filename: barrelOnlyFolder.getFilePath("src/index.ts"),
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

describe("consistent-barrel-files future expectations", () => {
  const { cleanupTemporaryDirectories, createFixtureSet } =
    createTemporaryFixtureManager();

  afterAll(cleanupTemporaryDirectories);

  it("ignores non-src files by default while still checking src files", () => {
    // Arrange
    const nonSourceFixture = createFixtureSet({
      "feature.ts": "export const feature = 1;",
    });
    const sourceFixture = createFixtureSet({
      "src/feature.ts": "export const feature = 1;",
    });

    const nonSourceCase = {
      code: "export const feature = 1;",
      filename: nonSourceFixture.getFilePath("feature.ts"),
    };
    const sourceCase = {
      code: "export const feature = 1;",
      errors: [{ messageId: "missingBarrel" }],
      filename: sourceFixture.getFilePath("src/feature.ts"),
    };
    const expectedSourceMessageIds = ["missingBarrel"];

    // Act
    const result = {
      nonSource: runRuleCase(
        "consistent-barrel-files",
        consistentBarrelFilesRule,
        nonSourceCase,
      ),
      source: runRuleCase(
        "consistent-barrel-files",
        consistentBarrelFilesRule,
        sourceCase,
      ),
    };

    // Assert
    expect(result.nonSource.messageIds).toStrictEqual([]);
    expect(result.source.messageIds).toStrictEqual(expectedSourceMessageIds);
  });
});
