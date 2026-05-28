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
} from "./__tests__/prefer-interface-types-test-helpers";
import { preferInterfaceTypesRule } from "./rule";

/** Listener keys expected on the rule listener map. */
type PreferInterfaceTypesListener =
  | "ArrowFunctionExpression"
  | "FunctionDeclaration"
  | "FunctionExpression"
  | "TSCallSignatureDeclaration"
  | "TSConstructSignatureDeclaration"
  | "TSDeclareFunction"
  | "TSFunctionType"
  | "TSMethodSignature"
  | "VariableDeclarator";

/** Listener keys provided by the rule. */
const listenerKeys: PreferInterfaceTypesListener[] = [
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
  "TSCallSignatureDeclaration",
  "TSConstructSignatureDeclaration",
  "TSDeclareFunction",
  "TSFunctionType",
  "TSMethodSignature",
  "VariableDeclarator",
];

describe("prefer interface types rule", () => {
  it("exposes metadata", () => {
    // Arrange
    const ruleType = preferInterfaceTypesRule.meta?.type;

    // Act
    const actualCreateType = typeof preferInterfaceTypesRule.create;

    // Assert
    expect(ruleType).toBe("suggestion");
    expect(actualCreateType).toBe("function");
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

  it("reports inline object type annotations on default parameters", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [
        {
          left: createParameter("TSTypeLiteral"),
          right: { name: "fallback", type: "Identifier" },
          type: "AssignmentPattern",
        },
      ],
    });

    // Act
    runListener(context, node);

    // Assert
    expect(reports).toStrictEqual([
      { messageId: "preferNamedObject", nodeType: "TSTypeLiteral" },
    ]);
  });

  it("reports inline object type annotations on default parameter properties", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [
        {
          parameter: {
            left: createParameter("TSTypeLiteral"),
            right: { name: "fallback", type: "Identifier" },
            type: "AssignmentPattern",
          },
          type: "TSParameterProperty",
        },
      ],
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

  it("reports inline object types in variable annotations", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = {
      id: createParameter("TSTypeLiteral"),
      type: "VariableDeclarator",
    };

    // Act
    runListener(context, node, "VariableDeclarator");

    // Assert
    expect(reports).toStrictEqual([
      { messageId: "preferNamedObject", nodeType: "TSTypeLiteral" },
    ]);
  });

  it("reports nested inline object types in union wrappers", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [
        {
          name: "value",
          type: "Identifier",
          typeAnnotation: {
            typeAnnotation: {
              type: "TSUnionType",
              types: [{ type: "TSTypeReference" }, { type: "TSTypeLiteral" }],
            },
          },
        },
      ],
    });

    // Act
    runListener(context, node);

    // Assert
    expect(reports).toStrictEqual([
      { messageId: "preferNamedObject", nodeType: "TSTypeLiteral" },
    ]);
  });

  it("reports nested inline object types in parenthesized wrappers", () => {
    // Arrange
    const { context, reports } = createContext();
    const node = createFunctionNode({
      returnType: {
        typeAnnotation: {
          type: "TSParenthesizedType",
          typeAnnotation: { type: "TSTypeLiteral" },
        },
      },
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

  it("wires all listener keys to executable handlers", () => {
    // Arrange
    const variableNode = {
      id: createParameter("TSTypeLiteral"),
      type: "VariableDeclarator",
    };
    const functionNode = createFunctionNode({
      params: [createParameter("TSTypeLiteral")],
    });

    // Act
    const actual = listenerKeys.map((listenerKey) => {
      const { context, reports } = createContext();
      const node =
        listenerKey === "VariableDeclarator" ? variableNode : functionNode;

      runListener(context, node, listenerKey);

      return { listenerKey, reports };
    });

    // Assert
    expect(actual).toStrictEqual(
      listenerKeys.map((listenerKey) => ({
        listenerKey,
        reports: [
          { messageId: "preferNamedObject", nodeType: "TSTypeLiteral" },
        ],
      })),
    );
  });
});
