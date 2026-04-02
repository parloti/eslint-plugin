import { describe, expect, it } from "vitest";

import * as types from "./types";

describe("require test companion types", () => {
  it("loads the module", () => {
    // Arrange

    // Act & Assert
    expect(types).toBeDefined();
  });
});
