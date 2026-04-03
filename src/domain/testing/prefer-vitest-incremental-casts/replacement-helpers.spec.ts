import { describe, expect, it } from "vitest";

import {
  applyTextReplacements,
  buildPropertyReplacement,
} from "./replacement-helpers";

describe("prefer-vitest-incremental-casts replacement helpers", () => {
  it("applies replacements in descending range order", () => {
    // Arrange
    const sourceText = "{ alpha, beta }";
    const replacements: Parameters<typeof applyTextReplacements>[1] = [
      {
        range: [2, 7],
        replacementText: "first",
      },
      {
        range: [9, 13],
        replacementText: "second",
      },
    ];

    // Act
    const actual = applyTextReplacements(sourceText, replacements, 0);

    // Assert
    expect(actual).toBe("{ first, second }");
  });

  it("exports the property replacement builder", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof buildPropertyReplacement;

    // Assert
    expect(actualType).toBe(expectedType);
  });
});
