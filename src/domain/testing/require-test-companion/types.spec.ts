import { describe, expect, it } from "vitest";

import * as types from "./types";

describe("require test companion types", () => {
  it("loads the module", () => {
    // Arrange
    const moduleNamespace = types;

    // Act
    const actual = moduleNamespace;

    // Assert
    expect(actual).toBeDefined();
  });
});
