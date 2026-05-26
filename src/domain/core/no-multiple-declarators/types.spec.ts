import { describe, expect, it } from "vitest";

import { hasFixData, hasRange } from "./types";

describe("no-multiple-declarators types", () => {
  it("recognizes ranged nodes", () => {
    // Arrange
    const node = { range: [0, 1] as [number, number], type: "Identifier" };

    // Act
    const actual = hasRange(node);

    // Assert
    expect(actual).toBe(true);
  });

  it("recognizes declarations with fix data", () => {
    // Arrange
    const declaration = {
      kind: "const",
      range: [0, 12] as [number, number],
      type: "VariableDeclaration",
    };

    // Act
    const actual = hasFixData(declaration);

    // Assert
    expect(actual).toBe(true);
  });

  it("rejects malformed ranges", () => {
    // Arrange
    const shortRangeNode = {
      range: [0] as unknown as [number, number],
      type: "Identifier",
    };
    const reversedRangeNode = {
      range: [2, 1] as [number, number],
      type: "Identifier",
    };
    const nonNumericRangeNode = {
      range: ["0", 1] as unknown as [number, number],
      type: "Identifier",
    };

    // Act
    const actual = {
      actualNonNumeric: hasRange(nonNumericRangeNode),
      actualReversed: hasRange(reversedRangeNode),
      actualShort: hasRange(shortRangeNode),
    };

    // Assert
    expect(actual.actualShort).toBe(false);
    expect(actual.actualReversed).toBe(false);
    expect(actual.actualNonNumeric).toBe(false);
  });

  it("rejects declarations without a kind", () => {
    // Arrange
    const declaration = {
      range: [0, 12] as [number, number],
      type: "VariableDeclaration",
    };

    // Act
    const actual = hasFixData(declaration);

    // Assert
    expect(actual).toBe(false);
  });
});
