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
    // Arrange
    const node = createFunctionNode([createParameter("TSTypeReference")]);

    // Act
    const lookup = getParameterTypeLookup(node);

    // Assert
    expect(lookup.get("value")?.type).toBe("TSTypeReference");
  });

  it("handles rest and parameter properties", () => {
    // Arrange
    const rest = { argument: createParameter("TSTypeReference") };
    const property = { parameter: createParameter("TSTypeReference") };

    // Act
    const lookup = getParameterTypeLookup(createFunctionNode([rest, property]));

    // Assert
    expect(lookup.get("value")?.type).toBe("TSTypeReference");
  });

  it("handles assignment patterns", () => {
    // Arrange
    const assignment = {
      left: createParameter("TSTypeReference"),
      type: "AssignmentPattern",
    };
    const node = createFunctionNode([assignment]);

    // Act
    const lookup = getParameterTypeLookup(node);

    // Assert
    expect(lookup.get("value")?.type).toBe("TSTypeReference");
  });

  it("skips parameters without type annotations", () => {
    // Arrange
    const node = createFunctionNode([createBareParameter()]);

    // Act
    const lookup = getParameterTypeLookup(node);

    // Assert
    expect(lookup.size).toBe(0);
  });

  it("skips when params is not an array", () => {
    // Arrange
    const node = {
      params: "nope",
      type: "FunctionDeclaration",
    } as unknown as Rule.Node;

    // Act
    const lookup = getParameterTypeLookup(node);

    // Assert
    expect(lookup.size).toBe(0);
  });

  it("skips non-object parameters", () => {
    // Arrange
    const node = createFunctionNode([void 0]);

    // Act
    const lookup = getParameterTypeLookup(node);

    // Assert
    expect(lookup.size).toBe(0);
  });

  it("skips non-identifier parameters", () => {
    // Arrange
    const node = createFunctionNode([{ name: "value", type: "ObjectPattern" }]);

    // Act
    const lookup = getParameterTypeLookup(node);

    // Assert
    expect(lookup.size).toBe(0);
  });

  it("skips when node is not an object", () => {
    // Arrange
    const node = void 0 as unknown as Rule.Node;

    // Act
    const lookup = getParameterTypeLookup(node);

    // Assert
    expect(lookup.size).toBe(0);
  });

  it("detects named type references", () => {
    // Arrange
    const namedType = { type: "TSTypeReference" };
    const literalType = { type: "TSTypeLiteral" };

    // Act
    const result = {
      literal: isNamedTypeReference(literalType),
      named: isNamedTypeReference(namedType),
    };

    // Assert
    expect(result.named).toBe(true);
    expect(result.literal).toBe(false);
  });
});
