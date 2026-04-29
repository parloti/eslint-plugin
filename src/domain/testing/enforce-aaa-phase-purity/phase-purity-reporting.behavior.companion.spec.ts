import { describe, expect, it } from "vitest";

import { phasePurityReportingBehaviorCompanion } from "./phase-purity-reporting.behavior";
import { phasePurityReportingBehaviorCompanionCompanion } from "./phase-purity-reporting.behavior.companion";

describe("enforce-aaa-phase-purity reporting behavior companion", () => {
  it("exports the companion marker", () => {
    // Arrange
    const expected = true;

    // Act
    const actual = {
      behavior: phasePurityReportingBehaviorCompanion,
      companion: phasePurityReportingBehaviorCompanionCompanion,
    };

    // Assert
    expect(actual).toStrictEqual({
      behavior: expected,
      companion: expected,
    });
  });
});
