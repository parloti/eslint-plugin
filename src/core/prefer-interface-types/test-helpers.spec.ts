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
    const { context, reports } = createContext();
    const node = createFunctionNode({ params: [] });

    runListener(context, node);

    expect(reports).toStrictEqual([]);
  });

  it("creates helper nodes", () => {
    const typeAnnotation = createTypeAnnotation("TSTypeLiteral");
    const parameter = createParameter("TSTypeReference");
    const bareParameter = createBareParameter();
    const parameterProperty = createParameterProperty("TSTypeLiteral");
    const restParameter = createRestParameter("TSTypeLiteral");
    const node = createFunctionNode({ params: [parameter] });

    expect(
      [
        typeAnnotation.typeAnnotation.type,
        parameter.type,
        bareParameter.type,
        parameterProperty.type,
        restParameter.type,
        node.type,
      ].join("|"),
    ).toBe(
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
    const { context, reports } = createContext();
    const node = createFunctionNode({ params: [] });

    context.report({ messageId: "ok", node: node as unknown as Rule.Node });

    expect(reports).toStrictEqual([
      { messageId: "ok", nodeType: "FunctionDeclaration" },
    ]);
  });
});
