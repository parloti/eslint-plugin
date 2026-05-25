import { afterAll, describe, expect, it } from "vitest";

import { noReexportsOutsideBarrelsRule } from "../../src";
import { createTemporaryFixtureManager, runRuleCase } from "../support";

describe("no-reexports-outside-barrels e2e", () => {
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
  const customBarrelFile = createFixtureSet({
    "mod.ts": 'export * from "./feature";',
  });

  it.each([
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
  ])("rejects re-exports outside barrels %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "no-reexports-outside-barrels",
      noReexportsOutsideBarrelsRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
  });

  it.each([
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
  ])("accepts local exports and barrels %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "no-reexports-outside-barrels",
      noReexportsOutsideBarrelsRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
