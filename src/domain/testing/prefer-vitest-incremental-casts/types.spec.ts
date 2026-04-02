import { TSESTree } from "@typescript-eslint/utils";
import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  BuildMatchResultContext,
  FactoryFunctionExpression,
  SupportedProperty,
} from "./types";

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

    // Act & Assert
    expectTypeOf<
      BuildMatchResultContext["factoryArgument"]
    >().toEqualTypeOf<FactoryFunctionExpression>();
  });
});
