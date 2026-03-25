import { assertActualExpectedNamesRule } from "../../src";

import { createRuleTester } from "../support/rule-tester";

const ruleTester = createRuleTester();

ruleTester.run("assert-actual-expected-names", assertActualExpectedNamesRule, {
  invalid: [
    {
      code: [
        'it("uses clear assert names", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const computedResult = run(input);",
        "",
        "  // Assert",
        "  const result = computedResult;",
        "  const value = 1;",
        "  expect(result).toBe(value);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "missingPrefix" }, { messageId: "missingPrefix" }],
      filename: "example.spec.ts",
    },
  ],
  valid: [
    {
      code: [
        'it("uses actual and expected prefixes", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const computedResult = run(input);",
        "",
        "  // Assert",
        "  const actualResult = computedResult;",
        "  const expectedValue = 1;",
        "  expect(actualResult).toBe(expectedValue);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    },
    {
      code: [
        'it("uses actual and expected prefixes", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const computedResult = run(input);",
        "",
        "  // Assert",
        "  const actual = computedResult;",
        "  const expected = 1;",
        "  expect(actual).toBe(expected);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    },
    {
      code: [
        'it("uses actual and expected prefixes", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const actual = run(input);",
        "",
        "  // Assert",
        "  const expected = 1;",
        "  expect(actual).toBe(expected);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    },
  ],
});
