import { requireActResultCaptureRule } from "../../src";
import { createRuleTester } from "../support/rule-tester";

/**
 *
 */
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
        'it("allows combined act and assert expectations", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act & Assert",
        "  expect(run(input)).toBe(1);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    },
    {
      code: [
        'it("allows helper-driven act interactions", () => {',
        "  // Arrange",
        "  const reports = [];",
        "  const context = { report: (value) => reports.push(value) };",
        '  const node = { type: "Identifier" };',
        "",
        "  // Act",
        "  runListener(context, node);",
        "",
        "  // Assert",
        "  expect(reports).toStrictEqual([]);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    },
    {
      code: [
        'it("allows rule listener creation", () => {',
        "  // Arrange",
        "  const reportCalls = [];",
        "  const customRule = { create: (context) => ({ context }) };",
        "  const context = { report: (value) => reportCalls.push(value) };",
        "",
        "  // Act",
        "  customRule.create(context);",
        "",
        "  // Assert",
        "  expect(reportCalls).toStrictEqual([]);",
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
