import { describe, expect, it } from "vitest";

import { preferInterfaceTypesRule } from "./rule";
import {
  createBareParameter,
  createContext,
  createFunctionNode,
  createParameter,
  createParameterProperty,
  createRestParameter,
  createTypeAnnotation,
  runListener,
} from "./test-helpers";

describe("prefer interface types rule", () => {
  it("exposes metadata", () => {
    // Arrange
    const ruleType = preferInterfaceTypesRule.meta?.type;

    // Act
    const createType = typeof preferInterfaceTypesRule.create;

    // Assert
    expect(ruleType).toBe("suggestion");
    expect(createType).toBe("function");
  });

  it("reports inline object type annotations on parameters", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [createParameter("TSTypeLiteral")],
    });

    // Act
    runListener(context, node);

    // Assert
    expect(reports).toStrictEqual([
      { messageId: "preferNamedObject", nodeType: "TSTypeLiteral" },
    ]);
  });

  it("reports inline object type annotations on rest parameters", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [createRestParameter("TSTypeLiteral")],
    });

    // Act
    runListener(context, node);

    // Assert
    expect(reports).toStrictEqual([
      { messageId: "preferNamedObject", nodeType: "TSTypeLiteral" },
    ]);
  });

  it("reports inline object type annotations on parameter properties", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [createParameterProperty("TSTypeLiteral")],
    });

    // Act
    runListener(context, node);

    // Assert
    expect(reports).toStrictEqual([
      { messageId: "preferNamedObject", nodeType: "TSTypeLiteral" },
    ]);
  });

  it("reports inline object type annotations on return types", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({
      returnType: createTypeAnnotation("TSTypeLiteral"),
    });

    // Act
    runListener(context, node);

    // Assert
    expect(reports).toStrictEqual([
      { messageId: "preferNamedObject", nodeType: "TSTypeLiteral" },
    ]);
  });

  it("skips named type references", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [createParameter("TSTypeReference")],
      returnType: createTypeAnnotation("TSTypeReference"),
    });

    // Act
    runListener(context, node);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips parameters without type annotations", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [createBareParameter()],
      returnType: {},
    });

    // Act
    runListener(context, node);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips non-object parameters", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [42 as unknown as Record<string, unknown>],
    });

    // Act
    runListener(context, node);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips non-object function nodes", () => {
    // Arrange
    const { context, reports } = createContext();

    // Act
    runListener(context);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips when params is not an array", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: "nope",
    });

    // Act
    runListener(context, node);

    // Assert
    expect(reports).toStrictEqual([]);
  });
});
