import { describe, expect, it } from "vitest";

import type { RuleMatch } from "./types";

describe("prefer-vi-mocked-import types", () => {
  it("exports types", () => {
    // Arrange
    const value = {} as RuleMatch;

    // Act & Assert
    expect(value).toBeDefined();
  });
});
