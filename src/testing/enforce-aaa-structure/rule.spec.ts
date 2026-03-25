import { describe, expect, it } from "vitest";

import { enforceAaaStructureRule } from "./rule";

describe("enforce-aaa-structure rule", () => {
  it("defines metadata and messages", () => {
    // Arrange
    const messages = enforceAaaStructureRule.meta?.messages;

    // Act
    const descriptionIncludesAaa =
      enforceAaaStructureRule.meta?.docs?.description?.includes(
        "Arrange, Act, Assert",
      );

    // Assert
    expect(messages).toHaveProperty("duplicateSection");
    expect(descriptionIncludesAaa).toBe(true);
  });
});
