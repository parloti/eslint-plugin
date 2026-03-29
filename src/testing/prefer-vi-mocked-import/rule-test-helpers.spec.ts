import { describe, expect, it } from "vitest";

import { runFix } from "./rule-test-helpers";

describe("prefer-vi-mocked-import rule-test-helpers", () => {
  it("exports runFix", () => {
    // Arrange

    // Act & Assert
    expect(runFix).toBeTypeOf("function");
  });
});
