import { describe, expect, it } from "vitest";

import { hasFixData, hasRange } from "./types";

describe("no-multiple-declarators types", () => {
  it("recognizes ranged nodes", () => {
    // Arrange
    const node = { range: [0, 1] as [number, number], type: "Identifier" };

    // Act
    const ranged = hasRange(node);

    // Assert
    expect(ranged).toBe(true);
  });

  it("recognizes declarations with fix data", () => {
    // Arrange
    const declaration = {
      kind: "const",
      range: [0, 12] as [number, number],
      type: "VariableDeclaration",
    };

    // Act
    const fixable = hasFixData(declaration);

    // Assert
    expect(fixable).toBe(true);
  });

  it("rejects declarations without a kind", () => {
    // Arrange
    const declaration = {
      range: [0, 12] as [number, number],
      type: "VariableDeclaration",
    };

    // Act
    const fixable = hasFixData(declaration);

    // Assert
    expect(fixable).toBe(false);
  });
});
