import { describe, expect, it } from "vitest";

import { walkNode } from "./match-walk";

describe("prefer-vi-mocked-import match-walk", () => {
  it("exports walkNode", () => {
    expect(walkNode).toBeTypeOf("function");
  });
});
