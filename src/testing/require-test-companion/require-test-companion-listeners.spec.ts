import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import { buildListenerForFilename } from "./require-test-companion-listeners";
import { getOptions } from "./require-test-companion-options";

describe("require-test-companion listeners", () => {
  it("skips when enforceIn is empty", () => {
    const state = getOptions([{ enforceIn: [] }]);
    const listener = buildListenerForFilename(
      {} as Rule.RuleContext,
      `${process.cwd()}/src/index.ts`,
      state,
    );

    expect(listener).toStrictEqual({});
  });
});
