import { describe, expect, it } from "vitest";

import { assertActualExpectedNamesRule } from "./rule";

describe("assert-actual-expected-names rule", () => {
  it("defines metadata and messages", () => {
    expect(assertActualExpectedNamesRule.meta?.messages).toHaveProperty(
      "missingPrefix",
    );
    expect(assertActualExpectedNamesRule.meta?.docs?.description).toContain(
      "Assert-phase",
    );
  });
});
