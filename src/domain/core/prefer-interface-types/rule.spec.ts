import { describe, expect, it } from "vitest";

import {
  createBareParameter,
  createFunctionNode,
  createParameter,
  createParameterProperty,
  createRestParameter,
  createTypeAnnotation,
  runListenerCase,
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

/** Report shape emitted for one inline object type annotation. */
const EXPECTED_INLINE_OBJECT_REPORT = {
  messageId: "preferNamedObject",
  nodeType: "TSTypeLiteral",
};

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
    // Arrange & Act
    const actualReports = runListenerCase(
      createFunctionNode({ params: [createParameter("TSTypeLiteral")] }),
    );

    // Assert
    expect(actualReports).toStrictEqual([EXPECTED_INLINE_OBJECT_REPORT]);
  });

  it("reports inline object type annotations on rest parameters", () => {
    // Arrange & Act
    const actualReports = runListenerCase(
      createFunctionNode({ params: [createRestParameter("TSTypeLiteral")] }),
    );

    // Assert
    expect(actualReports).toStrictEqual([EXPECTED_INLINE_OBJECT_REPORT]);
  });

  it("reports inline object type annotations on parameter properties", () => {
    // Arrange & Act
    const actualReports = runListenerCase(
      createFunctionNode({
        params: [createParameterProperty("TSTypeLiteral")],
      }),
    );

    // Assert
    expect(actualReports).toStrictEqual([EXPECTED_INLINE_OBJECT_REPORT]);
  });

  it("reports inline object type annotations on default parameters", () => {
    // Arrange & Act
    const actualReports = runListenerCase(
      createFunctionNode({
        params: [
          {
            left: createParameter("TSTypeLiteral"),
            right: { name: "fallback", type: "Identifier" },
            type: "AssignmentPattern",
          },
        ],
      }),
    );

    // Assert
    expect(actualReports).toStrictEqual([EXPECTED_INLINE_OBJECT_REPORT]);
  });

  it("reports inline object type annotations on default parameter properties", () => {
    // Arrange & Act
    const actualReports = runListenerCase(
      createFunctionNode({
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
      }),
    );

    // Assert
    expect(actualReports).toStrictEqual([EXPECTED_INLINE_OBJECT_REPORT]);
  });

  it("reports inline object type annotations on return types", () => {
    // Arrange & Act
    const actualReports = runListenerCase(
      createFunctionNode({ returnType: createTypeAnnotation("TSTypeLiteral") }),
    );

    // Assert
    expect(actualReports).toStrictEqual([EXPECTED_INLINE_OBJECT_REPORT]);
  });

  it("reports inline object types in variable annotations", () => {
    // Arrange & Act
    const actualReports = runListenerCase(
      { id: createParameter("TSTypeLiteral"), type: "VariableDeclarator" },
      "VariableDeclarator",
    );

    // Assert
    expect(actualReports).toStrictEqual([EXPECTED_INLINE_OBJECT_REPORT]);
  });

  it("reports nested inline object types in union wrappers", () => {
    // Arrange & Act
    const actualReports = runListenerCase(
      createFunctionNode({
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
      }),
    );

    // Assert
    expect(actualReports).toStrictEqual([EXPECTED_INLINE_OBJECT_REPORT]);
  });

  it("reports nested inline object types in parenthesized wrappers", () => {
    // Arrange & Act
    const actualReports = runListenerCase(
      createFunctionNode({
        returnType: {
          typeAnnotation: {
            type: "TSParenthesizedType",
            typeAnnotation: { type: "TSTypeLiteral" },
          },
        },
      }),
    );

    // Assert
    expect(actualReports).toStrictEqual([EXPECTED_INLINE_OBJECT_REPORT]);
  });

  it("skips named type references", () => {
    // Arrange & Act
    const actualReports = runListenerCase(
      createFunctionNode({
        params: [createParameter("TSTypeReference")],
        returnType: createTypeAnnotation("TSTypeReference"),
      }),
    );

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("skips parameters without type annotations", () => {
    // Arrange & Act
    const actualReports = runListenerCase(
      createFunctionNode({
        params: [createBareParameter()],
        returnType: {},
      }),
    );

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("skips non-object parameters", () => {
    // Arrange & Act
    const actualReports = runListenerCase(
      createFunctionNode({
        params: [42 as unknown as Record<string, unknown>],
      }),
    );

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("skips non-object function nodes", () => {
    // Arrange & Act
    const actualReports = runListenerCase();

    // Assert
    expect(actualReports).toStrictEqual([]);
  });

  it("skips when params is not an array", () => {
    // Arrange & Act
    const actualReports = runListenerCase(
      createFunctionNode({ params: "nope" }),
    );

    // Assert
    expect(actualReports).toStrictEqual([]);
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
    const actual = listenerKeys.map((listenerKey) => ({
      listenerKey,
      reports: runListenerCase(
        listenerKey === "VariableDeclarator" ? variableNode : functionNode,
        listenerKey,
      ),
    }));

    // Assert
    expect(actual).toStrictEqual(
      listenerKeys.map((listenerKey) => ({
        listenerKey,
        reports: [EXPECTED_INLINE_OBJECT_REPORT],
      })),
    );
  });
});
