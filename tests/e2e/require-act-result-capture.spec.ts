import { requireActResultCaptureRule } from "../../src";

import { createRuleTester } from "./rule-tester";

const ruleTester = createRuleTester();

ruleTester.run("require-act-result-capture", requireActResultCaptureRule, {
  invalid: [
    {
      code: [
        'it("captures act results", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  run(input);",
        "",
        "  // Assert",
        "  expect(input).toBe(1);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "captureActResult" }],
      filename: "example.spec.ts",
    },
  ],
  valid: [
    {
      code: [
        'it("allows captured results", () => {',
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
    {
      code: [
        'it("allows obvious void interactions", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  setValue(input);",
        "",
        "  // Assert",
        "  expect(input).toBe(1);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    },
  ],
});
