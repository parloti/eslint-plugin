import { describe, expect, it } from "vitest";

import { singleActStatementRule } from "./rule";

describe("single-act-statement rule", () => {
  it("defines metadata and messages", () => {
    expect(singleActStatementRule.meta?.messages).toHaveProperty(
      "multipleActStatements",
    );
    expect(singleActStatementRule.meta?.docs?.description).toContain(
      "single top-level statement",
    );
  });
});
