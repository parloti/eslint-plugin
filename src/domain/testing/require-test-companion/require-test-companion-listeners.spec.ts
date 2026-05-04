import type { Rule } from "eslint";

import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

import { buildListenerForFilename } from "./require-test-companion-listeners";
import { getOptions } from "./require-test-companion-options";

describe("require-test-companion listeners", () => {
  it("skips when enforceIn is empty", () => {
    // Arrange
    const state = getOptions([{ enforceIn: [] }]);

    // Act
    const listener = buildListenerForFilename(
      {} as Rule.RuleContext,
      `${cwd()}/src/index.ts`,
      state,
    );

    // Assert
    expect(listener).toStrictEqual({});
  });

  it("does not build a listener for source files", () => {
    // Arrange
    const state = getOptions([{ enforceIn: ["src/**/*.ts"] }]);

    // Act
    const listener = buildListenerForFilename(
      {} as Rule.RuleContext,
      `${cwd()}/src/feature.ts`,
      state,
    );

    // Assert
    expect(listener).toStrictEqual({});
  });

  it("builds a listener for test files", () => {
    // Arrange
    const state = getOptions([{ enforceIn: ["src/**/*.ts"] }]);

    // Act
    const listener = buildListenerForFilename(
      {} as Rule.RuleContext,
      `${cwd()}/src/feature.spec.ts`,
      state,
    );

    // Assert
    expect(listener).toHaveProperty("Program");
  });
});
