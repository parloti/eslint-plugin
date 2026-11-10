import { describe, expect, it } from "vitest";

import { createRecordingContext } from "./test-helpers";

describe("enforce-aaa-structure test helpers", () => {
  it("ignores reports without a message identifier", () => {
    // Arrange
    const { context, messageIds } = createRecordingContext();

    // Act
    context.report({
      message: "A report without an identifier",
      node: { name: "value", type: "Identifier" } as never,
    });

    // Assert
    expect(messageIds).toStrictEqual([]);
  });
});
