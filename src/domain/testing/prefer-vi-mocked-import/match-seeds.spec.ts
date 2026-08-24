import { describe, expect, it } from "vitest";

import { runFix } from "./__tests__/prefer-vi-mocked-import-rule-test-helpers";
import { collectSeeds } from "./match-seeds";

describe("prefer-vi-mocked-import match-seeds", () => {
  it("exports collectSeeds", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof collectSeeds;

    // Assert
    expect(actualType).toBe(expectedType);
  });
});

describe("prefer-vi-mocked-import rule (seed extraction)", () => {
  it("does not report when the mock import specifier is not a string literal", () => {
    // Arrange
    const input = [
      "const installDevelopmentDependencies = vi.fn();",
      'const deps = "./dependencies";',
      "vi.mock(import(deps), () => ({ installDevelopmentDependencies }));",
      "installDevelopmentDependencies.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });
});
