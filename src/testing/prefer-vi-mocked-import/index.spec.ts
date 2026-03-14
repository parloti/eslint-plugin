import { describe, expect, it } from "vitest";

import { preferViMockedImportRule } from "./index";

describe("prefer-vi-mocked-import index", () => {
  it("exports the rule", () => {
    expect(preferViMockedImportRule).toBeDefined();
  });
});
