import { describe, expect, it } from "vitest";

import { runRule, runRuleWithMockedAnalysis } from "./rule-test-helpers";

describe("enforce-aaa-phase-purity rule-test-helpers", () => {
  it("exports the rule test helpers", () => {
    // Arrange
    const helperTypes = [
      typeof runRule,
      typeof runRuleWithMockedAnalysis,
    ] as const;

    // Act & Assert
    expect(helperTypes).toStrictEqual(["function", "function"]);
  });
});
