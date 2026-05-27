import { describe, expect, it } from "vitest";

import { runRule } from "../../../shared/test-utils/enforce-aaa-phase-purity-rule-test-helpers";
import { enforceAaaPhasePurityRule } from "./rule";

describe("enforce-aaa-phase-purity rule", () => {
  describe("metadata", () => {
    it("defines metadata and messages", () => {
      // Arrange
      const expectedDescriptionFragment = "phases";

      // Act
      const metadata = enforceAaaPhasePurityRule.meta;

      // Assert
      expect(metadata?.messages).toHaveProperty("missingMeaningfulAct");
      expect(metadata?.docs?.description).toContain(
        expectedDescriptionFragment,
      );
    });
  });

  describe("reporting violations", () => {
    it("reports arrange assertions, assert awaits, and non-assertion assert code", () => {
      // Arrange
      const code = [
        'it("covers extra branches", async () => {',
        "  // Arrange",
        "  expect(true).toBe(true);",
        "",
        "  // Act",
        "  const actualResult = run();",
        "",
        "  // Assert",
        "  await verify(actualResult);",
        "  console.log(actualResult);",
        "});",
      ].join("\n");

      // Act
      const actualMessageIds = runRule(code).map(
        (message) => message.messageId,
      );

      // Assert
      expect(actualMessageIds).toStrictEqual([
        "assertionOutsideAssert",
        "awaitOutsideAct",
        "nonAssertionInAssert",
        "nonAssertionInAssert",
      ]);
    });

    it("reports await usage inside Assert", () => {
      // Arrange
      const code = [
        'it("awaits in assert", async () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const actualResult = run(input);",
        "",
        "  // Assert",
        "  await verify(actualResult);",
        "});",
      ].join("\n");

      // Act
      const actualMessageIds = runRule(code).map(
        (message) => message.messageId,
      );

      // Assert
      expect(actualMessageIds).toStrictEqual([
        "awaitOutsideAct",
        "nonAssertionInAssert",
      ]);
    });

    it("reports mutation inside Assert", () => {
      // Arrange
      const code = [
        'it("mutates in assert", () => {',
        "  // Arrange",
        "  const items = [1];",
        "",
        "  // Act",
        "  const actualResult = run(items);",
        "",
        "  // Assert",
        "  items.push(actualResult);",
        "});",
      ].join("\n");

      // Act
      const actualMessageIds = runRule(code).map(
        (message) => message.messageId,
      );

      // Assert
      expect(actualMessageIds).toStrictEqual(["mutationAfterAct"]);
    });

    it("reports arrange actions, async arrange work, act setup, and missing meaningful acts", () => {
      // Arrange
      const code = [
        'it("covers arrange and act edge cases", async () => {',
        "  // Arrange",
        "  await run(input);",
        "",
        "  // Act",
        "  const fixture = createFixture();",
        "",
        "  // Assert",
        "  expect(fixture).toBeDefined();",
        "});",
      ].join("\n");

      // Act
      const actualMessageIds = runRule(code).map(
        (message) => message.messageId,
      );

      // Assert
      expect(actualMessageIds).toStrictEqual([
        "awaitOutsideAct",
        "asyncInArrange",
        "actionInArrange",
      ]);
    });

    it("reports expectTypeOf in Act as an assertion outside Assert", () => {
      // Arrange
      const code = [
        'it("type-checks in act", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  expectTypeOf(run(input)).toEqualTypeOf<number>();",
        "",
        "  // Assert",
        "  expect(true).toBe(true);",
        "});",
      ].join("\n");

      // Act
      const actualMessageIds = runRule(code).map(
        (message) => message.messageId,
      );

      // Assert
      expect(actualMessageIds).toContain("assertionOutsideAssert");
    });

    it("reports expectTypeOf in Arrange as an assertion outside Assert", () => {
      // Arrange
      const code = [
        'it("type-checks in arrange", () => {',
        "  // Arrange",
        "  expectTypeOf<number>().toBeNumber();",
        "",
        "  // Act",
        "  const actualResult = run();",
        "",
        "  // Assert",
        "  expect(actualResult).toBe(1);",
        "});",
      ].join("\n");

      // Act
      const actualMessageIds = runRule(code).map(
        (message) => message.messageId,
      );

      // Assert
      expect(actualMessageIds).toContain("assertionOutsideAssert");
    });
  });

  describe("acceptance criteria", () => {
    it("skips files that do not declare all AAA sections", () => {
      // Arrange
      const code = [
        'it("skips incomplete markup", () => {',
        "  const actualResult = run();",
        "  expect(actualResult).toBe(1);",
        "});",
      ].join("\n");

      // Act
      const actualMessages = runRule(code);

      // Assert
      expect(actualMessages).toStrictEqual([]);
    });

    it.each([
      [
        [
          'it("stays clean", async () => {',
          "  // Arrange",
          "  const input = 1;",
          "",
          "  // Act",
          "  const actualResult = await run(input);",
          "",
          "  // Assert",
          "  expect(actualResult).toBe(1);",
          "});",
        ].join("\n"),
      ],
      [
        [
          'it("stays clean in combined phases", () => {',
          "  // Arrange",
          "  const input = 1;",
          "",
          "  // Act & Assert",
          "  const actualResult = run(input);",
          "  expect(actualResult).toBe(1);",
          "});",
        ].join("\n"),
      ],
    ])("accepts clean AAA flows %#", (code) => {
      // Arrange

      // Act
      const messages = runRule(code);

      // Assert
      expect(messages).toStrictEqual([]);
    });
  });
});
