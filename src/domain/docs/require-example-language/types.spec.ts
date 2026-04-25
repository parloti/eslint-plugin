import { describe, expect, it } from "vitest";

import * as types from "./types";

describe("require example language types", () => {
  it("loads the module", () => {
    // eslint-disable-next-line codeperfect/require-aaa-sections -- False positive, AAA sections are not needed for this test.
    // Arrange & Act & Assert
    expect(types).toBeDefined();
  });
});
