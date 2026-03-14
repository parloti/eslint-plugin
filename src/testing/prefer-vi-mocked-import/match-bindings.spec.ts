import { describe, expect, it } from "vitest";

import { collectBindings } from "./match-bindings";

describe("prefer-vi-mocked-import match-bindings", () => {
  it("exports collectBindings", () => {
    expect(collectBindings).toBeTypeOf("function");
  });

  it("ignores properties with keys that do not include a range", () => {
    const result = collectBindings(
      {
        properties: [
          {
            computed: false,
            key: { name: "a", type: "Identifier" },
            kind: "init",
            method: false,
            range: [0, 3],
            shorthand: true,
            type: "Property",
            value: { name: "a", range: [1, 2], type: "Identifier" },
          },
        ],
        type: "ObjectExpression",
      } as never,
      new Map([
        [
          "a",
          {
            declarationIdRange: [0, 1],
            initializerRange: [4, 10],
            localName: "a",
            statementRange: [0, 10],
          },
        ],
      ]),
    );

    expect(result).toStrictEqual([]);
  });

  it("ignores non-property entries", () => {
    const result = collectBindings(
      {
        properties: [
          {
            argument: { name: "a", type: "Identifier" },
            type: "SpreadElement",
          },
        ],
        type: "ObjectExpression",
      } as never,
      new Map(),
    );

    expect(result).toStrictEqual([]);
  });
});
