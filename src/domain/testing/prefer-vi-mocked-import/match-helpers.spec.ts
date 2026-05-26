import { describe, expect, it } from "vitest";

import {
  getFactoryReturnObject,
  getModuleSpecifier,
  getNewline,
  hasRange,
  isViFunctionCall,
} from "./match-helpers";

describe("prefer-vi-mocked-import match-helpers", () => {
  it("exposes helper functions", () => {
    // Arrange
    const newline = getNewline("a\n");

    // Act
    const helperTypes = {
      hasRange: typeof hasRange,
      isViFunctionCall: typeof isViFunctionCall,
    };

    // Assert
    expect(newline).toBe("\n");
    expect(helperTypes.hasRange).toBe("function");
    expect(helperTypes.isViFunctionCall).toBe("function");
  });

  it("returns undefined when factory is not an arrow function", () => {
    // Arrange
    const factory = {
      type: "Identifier",
    } as never;

    // Act
    const actualFactoryReturnObject = getFactoryReturnObject(factory);

    // Assert
    expect(actualFactoryReturnObject).toBe(void 0);
  });

  it("returns undefined when block-bodied factory does not return an object", () => {
    // Arrange
    const factory = {
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
    } as never;

    // Act
    const actualFactoryReturnObject = getFactoryReturnObject(factory);

    // Assert
    expect(actualFactoryReturnObject).toBe(void 0);
  });

  it("returns undefined for arrow factories with non-block expression bodies", () => {
    // Arrange
    const factory = {
      body: { name: "x", type: "Identifier" },
      type: "ArrowFunctionExpression",
    } as never;

    // Act
    const actualFactoryReturnObject = getFactoryReturnObject(factory);

    // Assert
    expect(actualFactoryReturnObject).toBe(void 0);
  });

  it("returns undefined for unsupported module argument expressions", () => {
    // Arrange
    const argument = {
      name: "x",
      type: "Identifier",
    } as never;

    // Act
    const actualModuleSpecifier = getModuleSpecifier(argument);

    // Assert
    expect(actualModuleSpecifier).toBe(void 0);
  });

  it("detects string specifier from plain literals", () => {
    // Arrange
    const argument = {
      type: "Literal",
      value: "./x",
    } as never;

    // Act
    const actualModuleSpecifier = getModuleSpecifier(argument);

    // Assert
    expect(actualModuleSpecifier).toBe("./x");
  });

  it("returns false for call expressions that are not member calls", () => {
    // Arrange
    const callExpression = {
      arguments: [],
      callee: { name: "fn", type: "Identifier" },
      type: "CallExpression",
    } as never;

    // Act
    const actualIsViCall = isViFunctionCall(callExpression);

    // Assert
    expect(actualIsViCall).toBe(false);
  });
});
