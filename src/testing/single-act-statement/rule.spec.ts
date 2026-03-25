import { describe, expect, it } from "vitest";

import { singleActStatementRule } from "./rule";

describe("single-act-statement rule", () => {
  it("defines metadata and messages", () => {
    // Arrange
    const messages = singleActStatementRule.meta?.messages;

    // Act
    const descriptionIncludesSingleAct =
      singleActStatementRule.meta?.docs?.description?.includes(
        "single top-level statement",
      );

    // Assert
    expect(messages).toHaveProperty("multipleActStatements");
    expect(descriptionIncludesSingleAct).toBe(true);
  });
});
