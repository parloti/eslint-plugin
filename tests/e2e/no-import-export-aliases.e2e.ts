import { describe, expect, it } from "vitest";

import { noImportExportAliasesRule } from "../../src";
import { runRuleCase } from "../support";

describe("no-import-export-aliases e2e", () => {
  it.each([
    {
      code: 'import { A as B } from "./feature";',
      errors: [{ messageId: "aliasNotAllowed" }],
      filename: "src/feature.ts",
    },
    {
      code: 'export { A as B } from "./feature";',
      errors: [{ messageId: "aliasNotAllowed" }],
      filename: "src/feature.ts",
    },
  ])("rejects aliased imports/exports without collisions %#", (testCase) => {
    // Arrange
    const ruleName = "no-import-export-aliases";

    // Act
    const result = runRuleCase(ruleName, noImportExportAliasesRule, testCase);

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
  });

  it.each([
    {
      code: [
        'import { A } from "./one";',
        'import { A as B } from "./two";',
      ].join("\n"),
      filename: "src/feature.ts",
    },
    {
      code: ['import { A } from "./one";', "export { A as B };"].join("\n"),
      filename: "src/feature.ts",
    },
    {
      code: 'import { A } from "./feature";\nexport { A };',
      filename: "src/feature.ts",
    },
  ])("accepts non-aliased or collision-avoiding forms %#", (testCase) => {
    // Arrange
    const ruleName = "no-import-export-aliases";

    // Act
    const result = runRuleCase(ruleName, noImportExportAliasesRule, testCase);

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
