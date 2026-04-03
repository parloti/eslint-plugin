import { describe, expect, it } from "vitest";

import { reportPhasePurityViolations } from "./phase-purity-reporting";

describe("enforce-aaa-phase-purity phase-purity-reporting", () => {
  it("exports the reporting helper", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof reportPhasePurityViolations;

    // Assert
    expect(actualType).toBe(expectedType);
  });
});
