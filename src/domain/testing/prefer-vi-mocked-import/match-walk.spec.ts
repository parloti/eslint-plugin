import { describe, expect, it } from "vitest";

import { walkNode } from "./match-walk";

describe("prefer-vi-mocked-import match-walk", () => {
  it("exports walkNode", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof walkNode;

    // Assert
    expect(actualType).toBe(expectedType);
  });
});
