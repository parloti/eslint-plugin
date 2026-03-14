import { enforceAaaStructureRule } from "../../src";

import { createRuleTester } from "./rule-tester";

const ruleTester = createRuleTester();

ruleTester.run("enforce-aaa-structure", enforceAaaStructureRule, {
  invalid: [
    {
      code: [
        'it("orders AAA phases", () => {',
        "  // Act",
        "  const actualResult = run();",
        "",
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Assert",
        "  expect(actualResult).toBe(input);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "invalidOrder" }],
      filename: "example.spec.ts",
    },
    {
      code: [
        'it("avoids duplicate act sections", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const actualResult = run(input);",
        "",
        "  // Act",
        "  const nextResult = rerun(actualResult);",
        "",
        "  // Assert",
        "  expect(nextResult).toBe(2);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "duplicateSection" }],
      filename: "example.spec.ts",
    },
  ],
  valid: [
    {
      code: [
        'it.only("keeps a single AAA flow", () => {',
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
