import { describe, expect, it } from "vitest";

import { noImportExportExtensionsRule } from "../../src";
import { runRuleCase } from "../support";

describe("no-import-export-extensions e2e", () => {
  it.each([
    {
      code: 'import { A } from "./feature.js";',
      errors: [{ messageId: "unexpectedExtension" }],
      filename: "src/feature.ts",
    },
    {
      code: 'export { A } from "./feature.ts";',
      errors: [{ messageId: "unexpectedExtension" }],
      filename: "src/feature.ts",
    },
    {
      code: 'export * from "@scope/package/index.js";',
      errors: [{ messageId: "unexpectedExtension" }],
      filename: "src/feature.ts",
    },
  ])(
    "rejects import/export module specifiers with extensions %#",
    (testCase) => {
      // Arrange

      // Act
      const result = runRuleCase(
        "no-import-export-extensions",
        noImportExportExtensionsRule,
        testCase,
      );

      // Assert
      expect(result.messageIds).toStrictEqual(
        testCase.errors.map((error) => error.messageId),
      );
    },
  );

  it.each([
    {
      code: 'import { A } from "./feature";',
      filename: "src/feature.ts",
    },
    {
      code: 'export { A } from "./feature";',
      filename: "src/feature.ts",
    },
    {
      code: 'import { readFileSync } from "node:fs";',
      filename: "src/feature.ts",
    },
  ])("accepts module specifiers without extensions %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "no-import-export-extensions",
      noImportExportExtensionsRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
