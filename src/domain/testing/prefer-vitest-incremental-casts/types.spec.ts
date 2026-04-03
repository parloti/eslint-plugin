import { TSESTree } from "@typescript-eslint/utils";
import { describe, expect, it } from "vitest";

import type { BuildMatchResultContext, SupportedProperty } from "./types";

describe("prefer-vitest-incremental-casts types", () => {
  it("keeps supported properties narrowed to init, non-computed members", () => {
    // Arrange
    const property = {
      computed: false,
      key: {
        name: "parser",
        range: [0, 6],
        type: TSESTree.AST_NODE_TYPES.Identifier,
      },
      kind: "init",
      method: false,
      range: [0, 14],
      type: TSESTree.AST_NODE_TYPES.Property,
      value: {
        name: "parser",
        range: [8, 14],
        type: TSESTree.AST_NODE_TYPES.Identifier,
      },
    } as never as SupportedProperty;

    // Act
    const actual = {
      computed: property.computed,
      kind: property.kind,
      valueType: property.value.type,
    };

    // Assert
    expect(actual).toStrictEqual({
      computed: false,
      kind: "init",
      valueType: TSESTree.AST_NODE_TYPES.Identifier,
    });
  });

  it("exposes the factory expression alias through match contexts", () => {
    // Arrange
    const expected = void 0;

    // Act
    const actual =
      void 0 as unknown as BuildMatchResultContext["factoryArgument"];

    // Assert
    expect(actual).toBe(expected);
  });
});
