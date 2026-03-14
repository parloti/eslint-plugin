import { describe, expect, expectTypeOf, it } from "vitest";

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
    expect(preferInterfaceTypesRule.meta?.type).toBe("suggestion");

    expectTypeOf(preferInterfaceTypesRule.create).toBeFunction();
  });

  it("reports inline object type annotations on parameters", () => {
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [createParameter("TSTypeLiteral")],
    });

    runListener(context, node);

    expect(reports).toStrictEqual([
      { messageId: "preferNamedObject", nodeType: "TSTypeLiteral" },
    ]);
  });

  it("reports inline object type annotations on rest parameters", () => {
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [createRestParameter("TSTypeLiteral")],
    });

    runListener(context, node);

    expect(reports).toStrictEqual([
      { messageId: "preferNamedObject", nodeType: "TSTypeLiteral" },
    ]);
  });

  it("reports inline object type annotations on parameter properties", () => {
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [createParameterProperty("TSTypeLiteral")],
    });

    runListener(context, node);

    expect(reports).toStrictEqual([
      { messageId: "preferNamedObject", nodeType: "TSTypeLiteral" },
    ]);
  });

  it("reports inline object type annotations on return types", () => {
    const { context, reports } = createContext();
    const node = createFunctionNode({
      returnType: createTypeAnnotation("TSTypeLiteral"),
    });

    runListener(context, node);

    expect(reports).toStrictEqual([
      { messageId: "preferNamedObject", nodeType: "TSTypeLiteral" },
    ]);
  });

  it("skips named type references", () => {
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [createParameter("TSTypeReference")],
      returnType: createTypeAnnotation("TSTypeReference"),
    });

    runListener(context, node);

    expect(reports).toStrictEqual([]);
  });

  it("skips parameters without type annotations", () => {
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [createBareParameter()],
      returnType: {},
    });

    runListener(context, node);

    expect(reports).toStrictEqual([]);
  });

  it("skips non-object parameters", () => {
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: [42 as unknown as Record<string, unknown>],
    });

    runListener(context, node);

    expect(reports).toStrictEqual([]);
  });

  it("skips non-object function nodes", () => {
    const { context, reports } = createContext();

    runListener(context);

    expect(reports).toStrictEqual([]);
  });

  it("skips when params is not an array", () => {
    const { context, reports } = createContext();
    const node = createFunctionNode({
      params: "nope",
    });

    runListener(context, node);

    expect(reports).toStrictEqual([]);
  });
});
