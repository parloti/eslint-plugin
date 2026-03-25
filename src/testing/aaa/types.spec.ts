import { describe, expect, it } from "vitest";

import type { AaaPhase, TestBlockAnalysis } from "./types";

describe("AAA types", () => {
  it("exposes the shared AAA type surface", () => {
    // Arrange
    const phase: AaaPhase = "Act";
    const analysis = void 0 as TestBlockAnalysis | undefined;

    // Act
    const normalizedPhase = `${phase}`;

    // Assert
    expect(normalizedPhase).toBe("Act");
    expect(analysis).toBeUndefined();
  });
});
