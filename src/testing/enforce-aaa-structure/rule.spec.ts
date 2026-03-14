import { describe, expect, it } from "vitest";

import { enforceAaaStructureRule } from "./rule";

describe("enforce-aaa-structure rule", () => {
  it("defines metadata and messages", () => {
    expect(enforceAaaStructureRule.meta?.messages).toHaveProperty(
      "duplicateSection",
    );
    expect(enforceAaaStructureRule.meta?.docs?.description).toContain(
      "Arrange, Act, Assert",
    );
  });
});
