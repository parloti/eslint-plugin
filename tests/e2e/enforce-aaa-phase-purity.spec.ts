import { enforceAaaPhasePurityRule } from "../../src";

import { createRuleTester } from "./rule-tester";

const ruleTester = createRuleTester();

ruleTester.run("enforce-aaa-phase-purity", enforceAaaPhasePurityRule, {
  invalid: [
    {
      code: [
        'it("keeps async work out of arrange", async () => {',
        "  // Arrange",
        "  let expectedValue = 1;",
        "  const actualResult = await run();",
        "",
        "  // Act",
        "  setupHarness();",
        "",
        "  // Assert",
        "  expectedValue = 2;",
        "  expect(actualResult).toBe(expectedValue);",
        "});",
      ].join("\n"),
      errors: [
        { messageId: "missingMeaningfulAct" },
        { messageId: "awaitOutsideAct" },
        { messageId: "asyncInArrange" },
        { messageId: "actionInArrange" },
        { messageId: "setupAfterAct" },
        { messageId: "mutationAfterAct" },
      ],
      filename: "example.spec.ts",
    },
    {
      code: [
        'test("keeps assertions in assert", () => {',
        "  // Arrange",
        "  const expectedValue = 1;",
        "",
        "  // Act",
        "  expect(run()).toBe(expectedValue);",
        "",
        "  // Assert",
        "  const actualResult = 1;",
        "  expect(actualResult).toBe(expectedValue);",
        "});",
      ].join("\n"),
      errors: [
        { messageId: "missingMeaningfulAct" },
        { messageId: "assertionOutsideAssert" },
      ],
      filename: "example.spec.ts",
    },
  ],
  valid: [
    {
      code: [
        'it("keeps phases pure", async () => {',
        "  // Arrange",
        "  const input = 1;",
        "  const expectedValue = 2;",
        "",
        "  // Act",
        "  const actualResult = await run(input);",
        "",
        "  // Assert",
        "  expect(actualResult).toBe(expectedValue);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    },
  ],
});
