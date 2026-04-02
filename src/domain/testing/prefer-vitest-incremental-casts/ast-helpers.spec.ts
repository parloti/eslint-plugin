import { TSESTree } from "@typescript-eslint/utils";
import { describe, expect, it } from "vitest";

import type { SupportedProperty } from "./types";

import {
  canUseShorthand,
  getFactoryReturnExpression,
  getModuleSpecifier,
  getPropertyName,
  isSupportedProperty,
  isVitestMockCall,
  shouldWrapImplicitObject,
  unwrapExpression,
} from "./ast-helpers";

describe("prefer-vitest-incremental-casts ast helpers", () => {
  it("reads module specifiers from supported arguments", () => {
    // Arrange
    const literal = {
      type: TSESTree.AST_NODE_TYPES.Literal,
      value: "fixture-module",
    } as never;
    const importExpression = {
      source: literal,
      type: TSESTree.AST_NODE_TYPES.ImportExpression,
    } as never;

    // Act
    const actual = {
      importExpression: getModuleSpecifier(importExpression),
      literal: getModuleSpecifier(literal),
    };

    // Assert
    expect(actual).toStrictEqual({
      importExpression: "fixture-module",
      literal: "fixture-module",
    });
  });

  it("recognizes supported properties and stable property names", () => {
    // Arrange
    const identifier = {
      name: "parser",
      range: [0, 6],
      type: TSESTree.AST_NODE_TYPES.Identifier,
    } as never;
    const property = {
      computed: false,
      key: identifier,
      kind: "init",
      loc: void 0,
      method: false,
      optional: false,
      parent: void 0 as never,
      range: [0, 6],
      shorthand: true,
      type: TSESTree.AST_NODE_TYPES.Property,
      value: identifier,
    } as unknown as SupportedProperty;

    // Act
    const actual = {
      propertyName: getPropertyName(property.key),
      supported: isSupportedProperty(property),
    };

    // Assert
    expect(actual).toStrictEqual({
      propertyName: "parser",
      supported: true,
    });
  });

  it("unwraps cast wrappers and preserves valid shorthand", () => {
    // Arrange
    const identifier = {
      name: "parser",
      range: [0, 6],
      type: TSESTree.AST_NODE_TYPES.Identifier,
    } as never;
    const property = {
      computed: false,
      key: identifier,
      kind: "init",
      method: false,
      range: [0, 6],
      type: TSESTree.AST_NODE_TYPES.Property,
      value: identifier,
    } as never;
    const wrappedExpression = {
      expression: identifier,
      type: TSESTree.AST_NODE_TYPES.TSAsExpression,
    } as never;

    // Act
    const actual = {
      shorthand: canUseShorthand({
        baseValue: identifier,
        keyName: "parser",
        needsCast: false,
        property,
      }),
      unwrappedExpression: unwrapExpression(wrappedExpression),
    };

    // Assert
    expect(actual.shorthand).toBe(true);
    expect(actual.unwrappedExpression).toBe(identifier);
  });

  it("reads block returns and Vitest mock calls", () => {
    // Arrange
    const objectExpression = {
      properties: [],
      range: [5, 7],
      type: TSESTree.AST_NODE_TYPES.ObjectExpression,
    } as never;
    const factoryArgument = {
      body: {
        body: [
          {
            argument: objectExpression,
            type: TSESTree.AST_NODE_TYPES.ReturnStatement,
          },
        ],
        type: TSESTree.AST_NODE_TYPES.BlockStatement,
      },
      type: TSESTree.AST_NODE_TYPES.ArrowFunctionExpression,
    } as never;
    const mockCall = {
      callee: {
        object: {
          name: "vi",
          type: TSESTree.AST_NODE_TYPES.Identifier,
        },
        property: {
          name: "doMock",
          type: TSESTree.AST_NODE_TYPES.Identifier,
        },
        type: TSESTree.AST_NODE_TYPES.MemberExpression,
      },
      type: TSESTree.AST_NODE_TYPES.CallExpression,
    } as never;

    // Act
    const actual = {
      isMockCall: isVitestMockCall(mockCall),
      returnExpression: getFactoryReturnExpression(factoryArgument),
    };

    // Assert
    expect(actual.isMockCall).toBe(true);
    expect(actual.returnExpression).toBe(objectExpression);
  });

  it("rejects unsupported properties and detects wrapped implicit objects", () => {
    // Arrange
    const identifier = {
      name: "parser",
      range: [0, 6],
      type: TSESTree.AST_NODE_TYPES.Identifier,
    } as never;
    const objectExpression = {
      properties: [],
      range: [1, 3],
      type: TSESTree.AST_NODE_TYPES.ObjectExpression,
    } as never;
    const parenthesizedObject = {
      expression: objectExpression,
      range: [0, 4],
      type: TSESTree.AST_NODE_TYPES.TSAsExpression,
    } as never;
    const unsupportedProperty = {
      computed: false,
      key: identifier,
      kind: "init",
      method: false,
      type: TSESTree.AST_NODE_TYPES.Property,
      value: {
        left: identifier,
        right: identifier,
        type: TSESTree.AST_NODE_TYPES.AssignmentPattern,
      },
    } as never;
    const factoryArgument = {
      body: parenthesizedObject,
      type: TSESTree.AST_NODE_TYPES.ArrowFunctionExpression,
    } as never;

    // Act
    const actual = {
      propertyName: getPropertyName({
        type: TSESTree.AST_NODE_TYPES.Literal,
        value: true,
      } as never),
      supported: isSupportedProperty(unsupportedProperty),
      wrapObject: shouldWrapImplicitObject(
        factoryArgument,
        parenthesizedObject,
        objectExpression,
      ),
    };

    // Assert
    expect(actual.propertyName).toBeUndefined();
    expect(actual.supported).toBe(false);
    expect(actual.wrapObject).toBe(true);
  });

  it("rejects non-literal property names and preserves direct object returns", () => {
    // Arrange
    const objectExpression = {
      properties: [],
      range: [0, 2],
      type: TSESTree.AST_NODE_TYPES.ObjectExpression,
    } as never;
    const factoryArgument = {
      body: objectExpression,
      type: TSESTree.AST_NODE_TYPES.ArrowFunctionExpression,
    } as never;

    // Act
    const actual = {
      propertyName: getPropertyName({
        quasis: [],
        type: TSESTree.AST_NODE_TYPES.TemplateLiteral,
      } as never),
      wrapObject: shouldWrapImplicitObject(
        factoryArgument,
        objectExpression,
        objectExpression,
      ),
    };

    // Assert
    expect(actual.propertyName).toBeUndefined();
    expect(actual.wrapObject).toBe(false);
  });
});
