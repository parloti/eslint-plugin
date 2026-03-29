import { afterAll, describe, expect, it } from "vitest";

import { requireTestCompanionRule } from "../../src";
import { createTemporaryFixtureManager, runRuleCase } from "../support";

describe("require-test-companion e2e", () => {
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

  it.each([
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
  ])("rejects missing source/test companions %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "require-test-companion",
      requireTestCompanionRule,
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
      filename: sourceWithTest.getFilePath("feature.ts"),
      options: [{ enforceIn: sourceWithTest.folderGlobs }],
    },
    {
      code: "export {};",
      filename: sourceWithTest.getFilePath("feature.spec.ts"),
      options: [{ enforceIn: sourceWithTest.folderGlobs }],
    },
  ])("accepts matched source/test companions %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "require-test-companion",
      requireTestCompanionRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
