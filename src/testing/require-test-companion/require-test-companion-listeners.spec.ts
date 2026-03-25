import type { Rule } from "eslint";

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
      `${process.cwd()}/src/index.ts`,
      state,
    );

    // Assert
    expect(listener).toStrictEqual({});
  });
});
