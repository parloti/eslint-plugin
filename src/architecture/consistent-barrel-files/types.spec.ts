import { describe, expect, it } from "vitest";

import * as types from "./types";

describe("consistent barrel files types", () => {
  it("loads the module", () => {
    // Arrange

    // Act & Assert
    expect(types).toBeDefined();
  });
});
