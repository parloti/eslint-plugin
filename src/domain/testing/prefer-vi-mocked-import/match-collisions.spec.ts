import { describe, expect, it } from "vitest";

import { runFix } from "./__tests__/prefer-vi-mocked-import-rule-test-helpers";
import { hasUnsafeImportCollisions } from "./match-collisions";

describe("prefer-vi-mocked-import match-collisions", () => {
  it("exports hasUnsafeImportCollisions", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof hasUnsafeImportCollisions;

    // Assert
    expect(actualType).toBe(expectedType);
  });
});

describe("prefer-vi-mocked-import rule (collision safety)", () => {
  it("does not report when imported export name would collide with top-level declaration", () => {
    // Arrange
    const input = [
      "const d = 1;",
      "const c = vi.fn();",
      'vi.mock(import("./mod"), () => ({ d: c }));',
      "c.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when imported export name would collide with another module import", () => {
    // Arrange
    const input = [
      'import { d } from "./other";',
      "const c = vi.fn();",
      'vi.mock(import("./mod"), () => ({ d: c }));',
      "c.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });
});
