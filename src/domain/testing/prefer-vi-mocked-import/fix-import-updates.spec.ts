import { describe, expect, it } from "vitest";

import { buildCombinedUpdateFixes } from "./fix-import-updates";

describe("prefer-vi-mocked-import fix-import-updates", () => {
  it("exports the combined update helper", () => {
    expect(buildCombinedUpdateFixes).toBeTypeOf("function");
  });
});
