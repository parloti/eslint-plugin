import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

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

describe("prefer-interface-types test helpers", () => {
  it("creates context and runs listeners", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({ params: [] });

    // Act
    runListener(context, node);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("creates helper nodes", () => {
    // Arrange
    const typeAnnotation = createTypeAnnotation("TSTypeLiteral");
    const parameter = createParameter("TSTypeReference");
    const bareParameter = createBareParameter();

    // Act
    const actualTypes = [
      typeAnnotation.typeAnnotation.type,
      parameter.type,
      bareParameter.type,
      createParameterProperty("TSTypeLiteral").type,
      createRestParameter("TSTypeLiteral").type,
      createFunctionNode({ params: [parameter] }).type,
    ].join("|");

    // Assert
    expect(actualTypes).toBe(
      [
        "TSTypeLiteral",
        "Identifier",
        "Identifier",
        "TSParameterProperty",
        "RestElement",
        "FunctionDeclaration",
      ].join("|"),
    );
  });

  it("records report entries", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({ params: [] });

    // Act
    context.report({ messageId: "ok", node: node as unknown as Rule.Node });

    // Assert
    expect(reports).toStrictEqual([
      { messageId: "ok", nodeType: "FunctionDeclaration" },
    ]);
  });
});
