import { SignatureKind } from "typescript";
import { describe, expect, it } from "vitest";

import { isOuterCastRequired, resolveFactoryTargetType } from "./type-helpers";

/** Object-like fixture with optional properties. */
interface PropertiesShape {
  /** Properties exposed by the synthetic type. */
  properties?: unknown[];
}

/** Synthetic signature return-type wrapper. */
interface ReturnTypeShape {
  /** Return type exposed by the synthetic signature. */
  returnType: unknown;
}

/**
 * Reads synthetic properties from a fixture type.
 * @param value Fixture type under inspection.
 * @returns Synthetic property list.
 * @example
 * ```typescript
 * const properties = getProperties({ properties: [] });
 * void properties;
 * ```
 */
const getProperties = (value: PropertiesShape): unknown[] =>
  value.properties ?? [];

/**
 * Reads the synthetic return type from a fixture signature.
 * @param value Fixture signature under inspection.
 * @returns Synthetic return type.
 * @example
 * ```typescript
 * const result = getReturnType({ returnType: "value" });
 * void result;
 * ```
 */
const getReturnType = (value: ReturnTypeShape): unknown => value.returnType;

describe("prefer-vitest-incremental-casts type helpers", () => {
  it("does not require an outer cast when every required property is present", () => {
    // Arrange
    const propertySymbol = {
      getDeclarations: (): [] => [],
      getName: (): string => "parser",
    } as never;
    const checker = {
      getPropertiesOfType: (): unknown[] => [propertySymbol],
      getSignaturesOfType: (): [] => [],
    } as never;

    // Act
    const actual = isOuterCastRequired({
      checker,
      propertyNames: new Set(["parser"]),
      targetType: {} as never,
    });

    // Assert
    expect(actual).toBe(false);
  });

  it("exports the factory target-type resolver", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof resolveFactoryTargetType;

    // Assert
    expect(actualType).toBe(expectedType);
  });

  it("prefers contextual target types when TypeScript provides one", () => {
    // Arrange
    const esObjectExpression = { name: "object" };
    const targetType = { properties: [{}] };
    const checker = {
      getAwaitedType: (value: unknown): unknown => value,
      getContextualType: (): unknown => targetType,
      getPropertiesOfType: getProperties,
      getSignaturesOfType: (): [] => [],
    } as never;

    // Act
    const actual = resolveFactoryTargetType({
      callExpression: { name: "call" } as never,
      checker,
      factoryArgument: { name: "factory" } as never,
      objectExpression: esObjectExpression as never,
      services: {
        esTreeNodeToTSNodeMap: new Map([
          [esObjectExpression, { name: "tsObject" }],
        ]),
      } as never,
    });

    // Assert
    expect(actual).toBe(targetType);
  });

  it("falls back to matching call signatures when contextual typing is unavailable", () => {
    // Arrange
    const firstArgument = { kind: "first" };
    const factoryArgument = { kind: "factory" };
    const callExpression = { kind: "call" };
    const specifierParameter = { kind: "specifierParameter" };
    const factoryParameter = { kind: "factoryParameter" };
    const targetType = { properties: [{}] };
    const signature = {
      getParameters: (): unknown[] => [specifierParameter, factoryParameter],
    };
    const checker = {
      getAwaitedType: (value: unknown): unknown => value,
      getContextualType: (): undefined => void 0,
      getPropertiesOfType: getProperties,
      getReturnTypeOfSignature: getReturnType,
      getSignaturesOfType: (value: unknown, kind: SignatureKind): unknown[] => {
        if (kind !== SignatureKind.Call) {
          return [];
        }

        if (value === "calleeType") {
          return [signature];
        }

        if (value === "factoryParameterType") {
          return [{ returnType: targetType }];
        }

        return [];
      },
      getTypeAtLocation: (value: unknown): unknown => {
        if (value === firstArgument) {
          return "firstArgumentType";
        }

        if (value === "calleeExpression") {
          return "calleeType";
        }

        return void 0;
      },
      getTypeOfSymbolAtLocation: (symbol: unknown, value: unknown): unknown => {
        if (symbol === specifierParameter && value === firstArgument) {
          return "specifierParameterType";
        }

        if (symbol === factoryParameter && value === "tsFactoryArgument") {
          return "factoryParameterType";
        }

        return void 0;
      },
      isTypeAssignableTo: (): boolean => true,
    } as never;

    // Act
    const actual = resolveFactoryTargetType({
      callExpression: callExpression as never,
      checker,
      factoryArgument: factoryArgument as never,
      objectExpression: { kind: "object" } as never,
      services: {
        esTreeNodeToTSNodeMap: new Map<unknown, unknown>([
          [
            callExpression,
            { arguments: [firstArgument], expression: "calleeExpression" },
          ],
          [factoryArgument, "tsFactoryArgument"],
          [{ kind: "object" }, { kind: "tsObject" }],
        ]),
      } as never,
    });

    // Assert
    expect(actual).toBe(targetType);
  });

  it("returns undefined when no signature inputs or matching signatures exist", () => {
    // Arrange
    const emptyCallExpression = { kind: "empty-call" };
    const unmatchedCallExpression = { kind: "unmatched-call" };
    const factoryArgument = { kind: "factory" };
    const checker = {
      getAwaitedType: (value: unknown): unknown => value,
      getContextualType: (): undefined => void 0,
      getPropertiesOfType: (): [] => [],
      getSignaturesOfType: (): unknown[] => [
        {
          getParameters: (): unknown[] => [
            { kind: "specifierParameter" },
            { kind: "factoryParameter" },
          ],
        },
      ],
      getTypeAtLocation: (): unknown => "type",
      getTypeOfSymbolAtLocation: (): unknown => "type",
      isTypeAssignableTo: (): boolean => false,
    } as never;
    const services = {
      esTreeNodeToTSNodeMap: new Map<unknown, unknown>([
        [
          emptyCallExpression,
          { arguments: [], expression: "calleeExpression" },
        ],
        [factoryArgument, "tsFactoryArgument"],
        [
          unmatchedCallExpression,
          { arguments: ["specifier"], expression: "calleeExpression" },
        ],
      ]),
    } as never;

    // Act
    const actual = {
      missingInputs: resolveFactoryTargetType({
        callExpression: emptyCallExpression as never,
        checker,
        factoryArgument: factoryArgument as never,
        objectExpression: { kind: "object-a" } as never,
        services,
      }),
      unmatchedSignature: resolveFactoryTargetType({
        callExpression: unmatchedCallExpression as never,
        checker,
        factoryArgument: factoryArgument as never,
        objectExpression: { kind: "object-b" } as never,
        services,
      }),
    };

    // Assert
    expect(actual.missingInputs).toBeUndefined();
    expect(actual.unmatchedSignature).toBeUndefined();
  });
});
