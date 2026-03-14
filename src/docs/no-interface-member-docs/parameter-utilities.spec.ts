import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import {
  getParameterTypeLookup,
  isNamedTypeReference,
} from "./parameter-utilities";

/** Type definition for rule data. */
interface ParameterNode {
  /** Name field value. */
  name: string;

  /** Type field value. */
  type: "Identifier";

  /** TypeAnnotation helper value. */
  typeAnnotation?: {
    /** TypeAnnotation helper value. */
    typeAnnotation?: {
      /** Type field value. */
      type: string;
    };
  };
}

/**
 * Creates createParameter.
 * @param type Input type value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createParameter();
 * ```
 */
const createParameter = (type: string): ParameterNode => ({
  name: "value",
  type: "Identifier",
  typeAnnotation: { typeAnnotation: { type } },
});

/**
 * Creates createBareParameter.
 * @returns Return value output.
 * @example
 * ```typescript
 * createBareParameter();
 * ```
 */
const createBareParameter = (): ParameterNode => ({
  name: "value",
  type: "Identifier",
});

/**
 * Creates createFunctionNode.
 * @param parameters Input parameters value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createFunctionNode();
 * ```
 */
const createFunctionNode = (parameters: unknown[]): Rule.Node =>
  ({
    params: parameters,
    type: "FunctionDeclaration",
  }) as Rule.Node;

describe("parameter utilities", () => {
  it("collects parameter type annotations", () => {
    const node = createFunctionNode([createParameter("TSTypeReference")]);
    const lookup = getParameterTypeLookup(node);

    expect(lookup.get("value")?.type).toBe("TSTypeReference");
  });

  it("handles rest and parameter properties", () => {
    const rest = { argument: createParameter("TSTypeReference") };
    const property = { parameter: createParameter("TSTypeReference") };
    const node = createFunctionNode([rest, property]);
    const lookup = getParameterTypeLookup(node);

    expect(lookup.get("value")?.type).toBe("TSTypeReference");
  });

  it("handles assignment patterns", () => {
    const assignment = {
      left: createParameter("TSTypeReference"),
      type: "AssignmentPattern",
    };
    const node = createFunctionNode([assignment]);
    const lookup = getParameterTypeLookup(node);

    expect(lookup.get("value")?.type).toBe("TSTypeReference");
  });

  it("skips parameters without type annotations", () => {
    const node = createFunctionNode([createBareParameter()]);
    const lookup = getParameterTypeLookup(node);

    expect(lookup.size).toBe(0);
  });

  it("skips when params is not an array", () => {
    const node = {
      params: "nope",
      type: "FunctionDeclaration",
    } as unknown as Rule.Node;
    const lookup = getParameterTypeLookup(node);

    expect(lookup.size).toBe(0);
  });

  it("skips non-object parameters", () => {
    const node = createFunctionNode([void 0]);
    const lookup = getParameterTypeLookup(node);

    expect(lookup.size).toBe(0);
  });

  it("skips non-identifier parameters", () => {
    const node = createFunctionNode([{ name: "value", type: "ObjectPattern" }]);
    const lookup = getParameterTypeLookup(node);

    expect(lookup.size).toBe(0);
  });

  it("skips when node is not an object", () => {
    const lookup = getParameterTypeLookup(void 0 as unknown as Rule.Node);

    expect(lookup.size).toBe(0);
  });

  it("detects named type references", () => {
    const named = isNamedTypeReference({ type: "TSTypeReference" });
    const literal = isNamedTypeReference({ type: "TSTypeLiteral" });

    expect(named).toBe(true);
    expect(literal).toBe(false);
  });
});
