import { describe, expect, it } from "vitest";

import { buildCombinedUpdateFixes } from "./fix-import-updates";

describe("prefer-vi-mocked-import fix-import-updates", () => {
  it("exports the combined update helper", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof buildCombinedUpdateFixes;

    // Assert
    expect(actualType).toBe(expectedType);
  });
});
