import { factory, SignatureKind, SymbolFlags, SyntaxKind } from "typescript";
import { describe, expect, it } from "vitest";

import {
  isOuterCastRequired,
  normalizeObjectLikeType,
  resolveFactoryReturnType,
} from "./type-shape-helpers";

/** Awaited object-like synthetic type. */
interface AwaitedObjectLikeShape extends ObjectLikeShape {
  /** Marker used by the awaited-type test fixture. */
  getAwaitedType: boolean;
}

/** Object-like synthetic type used by normalization helpers. */
interface ObjectLikeShape extends PropertiesShape, SignatureShape {
  /** Indicates whether the synthetic type is a union. */
  isUnion: () => boolean;

  /** Union branches exposed by the synthetic type. */
  types?: unknown[];
}

/** Object-like fixture with optional properties. */
interface PropertiesShape {
  /** Properties exposed by the synthetic type. */
  properties?: unknown[];
}

/** Synthetic signature that exposes a return type. */
interface ReturnTypeShape {
  /** Return type exposed by the synthetic signature. */
  returnType: unknown;
}

/** Synthetic type with optional call and construct signatures. */
interface SignatureShape {
  /** Synthetic call signatures. */
  callSignatures?: unknown[];

  /** Synthetic construct signatures. */
  constructSignatures?: unknown[];
}

describe("prefer-vitest-incremental-casts type shape helpers", () => {
  it("exports the helper surface", () => {
    // Arrange
    const actual = [
      typeof isOuterCastRequired,
      typeof normalizeObjectLikeType,
      typeof resolveFactoryReturnType,
    ];

    // Act & Assert
    expect(actual).toStrictEqual(["function", "function", "function"]);
  });

  it("requires outer casts for callable and required shapes only", () => {
    // Arrange
    const requiredProperty = {
      getDeclarations: (): [] => [],
      getFlags: (): number => 0,
      getName: (): string => "parser",
    } as never;
    const optionalProperty = {
      getDeclarations: (): [] => [],
      getFlags: (): number => SymbolFlags.Optional,
      getName: (): string => "parser",
    } as never;
    const checker = {
      getPropertiesOfType: (value: PropertiesShape): unknown[] =>
        value.properties ?? [],
      getSignaturesOfType: (
        value: SignatureShape,
        kind: SignatureKind,
      ): unknown[] =>
        kind === SignatureKind.Call
          ? (value.callSignatures ?? [])
          : (value.constructSignatures ?? []),
    } as never;

    // Act
    const actual = {
      callable: isOuterCastRequired({
        checker,
        propertyNames: new Set(["parser"]),
        targetType: { callSignatures: [{}] } as never,
      }),
      missingRequired: isOuterCastRequired({
        checker,
        propertyNames: new Set<string>(),
        targetType: { properties: [requiredProperty] } as never,
      }),
      optionalOnly: isOuterCastRequired({
        checker,
        propertyNames: new Set<string>(),
        targetType: { properties: [optionalProperty] } as never,
      }),
    };

    // Assert
    expect(actual).toStrictEqual({
      callable: true,
      missingRequired: true,
      optionalOnly: false,
    });
  });

  it("normalizes awaited unions and factory return types", () => {
    // Arrange
    const objectLikeType: AwaitedObjectLikeShape = {
      callSignatures: [],
      constructSignatures: [],
      getAwaitedType: true,
      isUnion: (): boolean => false,
      properties: [{}],
    };
    const primitiveType: ObjectLikeShape = {
      callSignatures: [],
      constructSignatures: [],
      isUnion: (): boolean => false,
      properties: [],
    };
    const checker = {
      getAwaitedType: (targetType: unknown): unknown => targetType,
      getPropertiesOfType: (value: PropertiesShape): unknown[] =>
        value.properties ?? [],
      getReturnTypeOfSignature: (signature: ReturnTypeShape): unknown =>
        signature.returnType,
      getSignaturesOfType: (
        value: SignatureShape,
        kind: SignatureKind,
      ): unknown[] =>
        kind === SignatureKind.Call
          ? (value.callSignatures ?? [])
          : (value.constructSignatures ?? []),
    } as never;

    // Act
    const actual = {
      normalized: normalizeObjectLikeType(checker, {
        constructSignatures: [],
        isUnion: (): boolean => true,
        types: [objectLikeType, primitiveType],
      } as never),
      resolvedReturnType: resolveFactoryReturnType(checker, {
        callSignatures: [
          { returnType: primitiveType },
          { returnType: objectLikeType },
        ],
      } as never),
    };

    // Assert
    expect(actual.normalized).toBe(objectLikeType);
    expect(actual.resolvedReturnType).toBe(objectLikeType);
  });

  it("handles construct signatures and unresolved object-like returns", () => {
    // Arrange
    const unresolvedReturnType: ObjectLikeShape = {
      callSignatures: [],
      constructSignatures: [],
      isUnion: (): boolean => false,
      properties: [],
    };
    const checker = {
      getAwaitedType: (value: unknown): unknown => value,
      getPropertiesOfType: (value: PropertiesShape): unknown[] =>
        value.properties ?? [],
      getReturnTypeOfSignature: (): unknown => unresolvedReturnType,
      getSignaturesOfType: (
        value: SignatureShape,
        kind: SignatureKind,
      ): unknown[] =>
        kind === SignatureKind.Call
          ? (value.callSignatures ?? [])
          : (value.constructSignatures ?? []),
    } as never;

    // Act
    const actual = {
      constructable: isOuterCastRequired({
        checker,
        propertyNames: new Set<string>(),
        targetType: { constructSignatures: [{}] } as never,
      }),
      normalizedPrimitive: normalizeObjectLikeType(checker, {
        callSignatures: [],
        constructSignatures: [],
        isUnion: (): boolean => false,
        properties: [],
      } as never),
      unresolvedFactoryReturnType: resolveFactoryReturnType(checker, {
        callSignatures: [{ returnType: unresolvedReturnType }],
      } as never),
    };

    // Assert
    expect(actual).toStrictEqual({
      constructable: true,
      normalizedPrimitive: void 0,
      unresolvedFactoryReturnType: void 0,
    });
  });

  it("returns undefined when awaited normalization cannot resolve a target type", () => {
    // Arrange
    const checker = {
      getAwaitedType: () => void 0,
      getPropertiesOfType: (): [] => [],
      getSignaturesOfType: (): [] => [],
    } as never;

    // Act
    const actual = normalizeObjectLikeType(checker, {
      callSignatures: [],
      constructSignatures: [],
      isUnion: (): boolean => false,
      properties: [{}],
    } as never);

    // Assert
    expect(actual).toBeUndefined();
  });

  it("handles declaration-based optional properties and missing declarations", () => {
    // Arrange
    const checker = {
      getAwaitedType: (value: unknown): unknown => value,
      getPropertiesOfType: (value: PropertiesShape): unknown[] =>
        value.properties ?? [],
      getSignaturesOfType: (): [] => [],
    } as never;
    const directObjectLikeType: ObjectLikeShape = {
      callSignatures: [],
      constructSignatures: [],
      isUnion: (): boolean => false,
      properties: [{}],
    };
    const propertyWithoutDeclarations = {
      getDeclarations: () => void 0,
      getFlags: (): number => 0,
      getName: (): string => "parser",
    } as never;
    const optionalProperty = {
      flags: SymbolFlags.Optional,
      getDeclarations: (): unknown[] => [
        { questionToken: {}, type: "PropertySignature" },
      ],
      getName: (): string => "parser",
    } as never;
    const optionalPropertyByDeclaration = {
      getDeclarations: (): unknown[] => [
        factory.createPropertySignature(
          void 0,
          factory.createIdentifier("parser"),
          factory.createToken(SyntaxKind.QuestionToken),
          factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
        ),
      ],
      getFlags: (): number => 0,
      getName: (): string => "parser",
    } as never;

    // Act
    const actual = {
      missingWithoutDeclarations: isOuterCastRequired({
        checker,
        propertyNames: new Set<string>(),
        targetType: { properties: [propertyWithoutDeclarations] } as never,
      }),
      normalizedDirectObject: normalizeObjectLikeType(
        checker,
        directObjectLikeType as never,
      ),
      optionalByDeclaration: isOuterCastRequired({
        checker,
        propertyNames: new Set<string>(),
        targetType: { properties: [optionalPropertyByDeclaration] } as never,
      }),
      optionalByFlags: isOuterCastRequired({
        checker,
        propertyNames: new Set<string>(),
        targetType: { properties: [optionalProperty] } as never,
      }),
    };

    // Assert
    expect(actual.missingWithoutDeclarations).toBe(true);
    expect(actual.normalizedDirectObject).toBe(directObjectLikeType);
    expect(actual.optionalByDeclaration).toBe(false);
    expect(actual.optionalByFlags).toBe(false);
  });
});
