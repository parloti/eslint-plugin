import { describe, expect, expectTypeOf, it } from "vitest";

import {
  getFactoryReturnObject,
  getModuleSpecifier,
  getNewline,
  hasRange,
  isViFunctionCall,
} from "./match-helpers";

describe("prefer-vi-mocked-import match-helpers", () => {
  it("exposes helper functions", () => {
    expect(getNewline("a\n")).toBe("\n");

    expectTypeOf(hasRange).toBeFunction();
    expectTypeOf(isViFunctionCall).toBeFunction();
  });

  it("returns undefined when factory is not an arrow function", () => {
    expect(getFactoryReturnObject({ type: "Identifier" } as never)).toBe(
      void 0,
    );
  });

  it("returns undefined when block-bodied factory does not return an object", () => {
    expect(
      getFactoryReturnObject({
        body: {
          body: [
            {
              argument: { type: "Literal", value: 1 },
              type: "ReturnStatement",
            },
          ],
          type: "BlockStatement",
        },
        type: "ArrowFunctionExpression",
      } as never),
    ).toBe(void 0);
  });

  it("returns undefined for arrow factories with non-block expression bodies", () => {
    expect(
      getFactoryReturnObject({
        body: { name: "x", type: "Identifier" },
        type: "ArrowFunctionExpression",
      } as never),
    ).toBe(void 0);
  });

  it("returns undefined for unsupported module argument expressions", () => {
    expect(getModuleSpecifier({ name: "x", type: "Identifier" } as never)).toBe(
      void 0,
    );
  });

  it("detects string specifier from plain literals", () => {
    expect(getModuleSpecifier({ type: "Literal", value: "./x" } as never)).toBe(
      "./x",
    );
  });

  it("returns false for call expressions that are not member calls", () => {
    expect(
      isViFunctionCall({
        arguments: [],
        callee: { name: "fn", type: "Identifier" },
        type: "CallExpression",
      } as never),
    ).toBe(false);
  });
});
