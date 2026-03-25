import { describe, expect, it } from "vitest";

import { requireActResultCaptureRule } from "./rule";

describe("require-act-result-capture rule", () => {
  it("defines metadata and messages", () => {
    // Arrange
    const messages = requireActResultCaptureRule.meta?.messages;

    // Act
    const descriptionIncludesActExpressions =
      requireActResultCaptureRule.meta?.docs?.description?.includes(
        "Act expressions",
      );

    // Assert
    expect(messages).toHaveProperty("captureActResult");
    expect(descriptionIncludesActExpressions).toBe(true);
  });
});
