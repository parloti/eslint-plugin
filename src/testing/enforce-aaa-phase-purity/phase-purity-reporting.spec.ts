import { describe, expect, it } from "vitest";

import { reportPhasePurityViolations } from "./phase-purity-reporting";

describe("enforce-aaa-phase-purity phase-purity-reporting", () => {
  it("exports the reporting helper", () => {
    // Arrange

    // Act & Assert
    expect(reportPhasePurityViolations).toBeTypeOf("function");
  });
});
