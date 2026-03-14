import { describe, expect, it } from "vitest";

import { buildAllowedRanges, collectMemberRewrites } from "./match-rewrites";

describe("prefer-vi-mocked-import match-rewrites", () => {
  it("exports collectMemberRewrites", () => {
    expect(collectMemberRewrites).toBeTypeOf("function");
  });

  it("includes declaration id ranges when declaration exists", () => {
    const allowed = buildAllowedRanges(
      [
        {
          exportedName: "a",
          localName: "a",
          propertyKeyRange: [1, 2],
          propertyRange: [1, 5],
          propertyValueRange: [3, 4],
        },
      ],
      new Map([
        [
          "a",
          {
            declarationIdRange: [10, 11],
            initializerRange: [12, 18],
            localName: "a",
            statementRange: [10, 19],
          },
        ],
      ]),
      [],
    );

    expect(allowed.has("10:11")).toBe(true);
  });

  it("skips declaration id range when declaration is absent", () => {
    const allowed = buildAllowedRanges(
      [
        {
          exportedName: "a",
          localName: "a",
          propertyKeyRange: [1, 2],
          propertyRange: [1, 5],
          propertyValueRange: [3, 4],
        },
      ],
      new Map(),
      [],
    );

    expect(allowed.has("10:11")).toBe(false);
  });
});
