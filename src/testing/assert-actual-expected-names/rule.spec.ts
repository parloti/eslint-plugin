import { describe, expect, it } from "vitest";

import { assertActualExpectedNamesRule } from "./rule";

describe("assert-actual-expected-names rule", () => {
  it("defines metadata and messages", () => {
    // Arrange
    const messages = assertActualExpectedNamesRule.meta?.messages;

    // Act
    const descriptionIncludesAssertPhase =
      assertActualExpectedNamesRule.meta?.docs?.description?.includes(
        "Assert-phase",
      );

    // Assert
    expect(messages).toHaveProperty("missingPrefix");
    expect(descriptionIncludesAssertPhase).toBe(true);
  });
});
