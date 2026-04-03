import { describe, expect, it } from "vitest";

import { runFix } from "./rule-test-helpers";

describe("prefer-vi-mocked-import rule-test-helpers", () => {
  it("exports runFix", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof runFix;

    // Assert
    expect(actualType).toBe(expectedType);
  });
});
