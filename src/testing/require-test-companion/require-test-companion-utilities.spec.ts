import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import {
  buildListenerForFilename,
  getOptions,
} from "./require-test-companion-utilities";

/**
 * Build a minimal rule context stub.
 * @returns Rule context stub.
 * @example
 * ```typescript
 * const context = createContext();
 * ```
 */
const createContext = (): Rule.RuleContext =>
  ({}) as unknown as Rule.RuleContext;

describe("require-test-companion utilities", () => {
  it("normalizes options", () => {
    // Arrange
    const options = getOptions([{ enforceIn: ["**"] }]);

    // Act & Assert
    expect(options.enforceIn).toStrictEqual(["**"]);
  });

  it("builds a listener", () => {
    // Arrange
    const listener = buildListenerForFilename(
      createContext(),
      "/repo/src/feature.ts",
      getOptions([]),
    );

    // Act & Assert
    expect(listener).toBeTypeOf("object");
  });
});
