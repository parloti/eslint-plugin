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
    const options = getOptions([{ enforceIn: ["**"] }]);

    expect(options.enforceIn).toStrictEqual(["**"]);
  });

  it("builds a listener", () => {
    const listener = buildListenerForFilename(
      createContext(),
      "/repo/src/feature.ts",
      getOptions([]),
    );

    expect(listener).toBeTypeOf("object");
  });
});
