import { afterAll, describe, expect, it } from "vitest";

import { codeperfectPlugin } from "../../src";
import { createTemporaryFixtureManager, runRuleCase } from "../support";

const preferPackageSubpathImportsRule =
  codeperfectPlugin.rules["prefer-package-subpath-imports"];

describe("prefer-package-subpath-imports e2e", () => {
  const { cleanupTemporaryDirectories, createFixtureSet } =
    createTemporaryFixtureManager();

  afterAll(cleanupTemporaryDirectories);

  const singlePackage = createFixtureSet({
    "package.json": JSON.stringify({ imports: { "#src/*": "./src/*" } }),
    "src/feature.ts": "",
    "src/features/consumer.ts": "",
  });
  const workspacePackage = createFixtureSet({
    "package.json": JSON.stringify({ imports: { "#root/*": "./src/*" } }),
    "packages/app/package.json": JSON.stringify({
      imports: { "#app/*": "./src/*" },
    }),
    "packages/app/src/features/feature.ts": "",
  });
  const packageWithoutImports = createFixtureSet({
    "package.json": JSON.stringify({ name: "demo" }),
    "src/feature.ts": "",
  });

  it.each([
    {
      code: 'import { value } from "../config";',
      errors: [{ messageId: "usePackageImportAlias" }],
      filename: singlePackage.getFilePath("src/features/consumer.ts"),
      output: 'import { value } from "#src/config";',
    },
    {
      code: 'import { util } from "../util";',
      errors: [{ messageId: "usePackageImportAlias" }],
      filename: workspacePackage.getFilePath(
        "packages/app/src/features/feature.ts",
      ),
      output: 'import { util } from "#app/util";',
    },
  ])("rejects relative paths covered by package imports %#", (testCase) => {
    // Arrange
    const ruleName = "prefer-package-subpath-imports";

    // Act
    const result = runRuleCase(
      ruleName,
      preferPackageSubpathImportsRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
    expect(result.output).toBe(testCase.output);
  });

  it.each([
    {
      code: 'import { value } from "../config";',
      filename: packageWithoutImports.getFilePath("src/feature.ts"),
    },
    {
      code: 'import { value } from "#src/config";',
      filename: singlePackage.getFilePath("src/features/consumer.ts"),
    },
    {
      code: 'import { readFileSync } from "node:fs";',
      filename: singlePackage.getFilePath("src/features/consumer.ts"),
    },
    {
      code: 'import { sibling } from "./sibling";',
      filename: singlePackage.getFilePath("src/feature.ts"),
    },
  ])("accepts specifiers outside package import coverage %#", (testCase) => {
    // Arrange
    const ruleName = "prefer-package-subpath-imports";

    // Act
    const result = runRuleCase(
      ruleName,
      preferPackageSubpathImportsRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
