import { describe, expect, it } from "vitest";

import type { RuleMatch } from "./types";

describe("prefer-vi-mocked-import types", () => {
  it("exports types", () => {
    const value = {} as RuleMatch;

    expect(value).toBeDefined();
  });
});
