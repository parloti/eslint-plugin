import { singleActStatementRule } from "../../src";

import { createRuleTester } from "./rule-tester";

const ruleTester = createRuleTester();

ruleTester.run("single-act-statement", singleActStatementRule, {
  invalid: [
    {
      code: [
        'it("keeps one act statement", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const actualResult = run(input);",
        "  cleanup(actualResult);",
        "",
        "  // Assert",
        "  expect(actualResult).toBe(1);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "multipleActStatements" }],
      filename: "example.spec.ts",
    },
  ],
  valid: [
    {
      code: [
        'it("allows one act declaration", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const actualResult = run(input);",
        "",
        "  // Assert",
        "  expect(actualResult).toBe(1);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    },
  ],
});
