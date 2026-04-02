import type * as ts from "typescript";

import { SignatureKind } from "typescript";

import type {
  MatchingSignatureReturnTypeContext,
  OuterCastContext,
  ResolveFactoryTargetTypeContext,
  SignatureMatchInputs,
} from "./types";

import {
  isOuterCastRequired as isOuterCastRequiredImpl,
  normalizeObjectLikeType,
  resolveFactoryReturnType,
} from "./type-shape-helpers";

/**
 * Reads the contextual type assigned to the returned mock object literal.
 * @param context Type-resolution inputs for the current mock factory.
 * @returns Contextual object-like type when TypeScript provides one.
 * @example
 * ```typescript
 * const targetType = getContextualFactoryTargetType(context);
 * ```
 */
function getContextualFactoryTargetType(
  context: ResolveFactoryTargetTypeContext,
): ts.Type | undefined {
  const { checker, objectExpression, services } = context;

  return normalizeObjectLikeType(
    checker,
    checker.getContextualType(
      services.esTreeNodeToTSNodeMap.get(objectExpression),
    ),
  );
}

/**
 * Resolves the factory return type for one compatible mock signature.
 * @param context Inputs required to inspect one callable signature.
 * @returns Normalized object-like return type when the signature matches.
 * @example
 * ```typescript
 * const returnType = getMatchingSignatureReturnType(context);
 * ```
 */
function getMatchingSignatureReturnType(
  context: MatchingSignatureReturnTypeContext,
): ts.Type | undefined {
  const {
    checker,
    firstArgument,
    firstArgumentType,
    signature,
    tsFactoryArgument,
  } = context;
  const [specifierParameter, factoryParameter] = signature.getParameters();

  if (specifierParameter === void 0 || factoryParameter === void 0) {
    return void 0;
  }

  const specifierParameterType = checker.getTypeOfSymbolAtLocation(
    specifierParameter,
    firstArgument,
  );

  if (!checker.isTypeAssignableTo(firstArgumentType, specifierParameterType)) {
    return void 0;
  }

  return resolveFactoryReturnType(
    checker,
    checker.getTypeOfSymbolAtLocation(factoryParameter, tsFactoryArgument),
  );
}

/**
 * Resolves a target type by matching the mock call against callable signatures.
 * @param context Type-resolution inputs for the current mock factory.
 * @returns Object-like return type inferred from the matched signature.
 * @example
 * ```typescript
 * const targetType = getSignatureFactoryTargetType(context);
 * ```
 */
function getSignatureFactoryTargetType(
  context: ResolveFactoryTargetTypeContext,
): ts.Type | undefined {
  const signatureMatchInputs = getSignatureMatchInputs(context);

  if (signatureMatchInputs === void 0) {
    return void 0;
  }

  for (const signature of context.checker.getSignaturesOfType(
    signatureMatchInputs.calleeType,
    SignatureKind.Call,
  )) {
    const returnType = getMatchingSignatureReturnType({
      checker: context.checker,
      firstArgument: signatureMatchInputs.firstArgument,
      firstArgumentType: signatureMatchInputs.firstArgumentType,
      signature,
      tsFactoryArgument: signatureMatchInputs.tsFactoryArgument,
    });

    if (returnType !== void 0) {
      return returnType;
    }
  }

  return void 0;
}

/**
 * Collects the TypeScript nodes and types needed for signature matching.
 * @param context Type-resolution inputs for the current mock factory.
 * @returns Normalized signature-matching inputs when the call has a first argument.
 * @example
 * ```typescript
 * const inputs = getSignatureMatchInputs(context);
 * ```
 */
function getSignatureMatchInputs(
  context: ResolveFactoryTargetTypeContext,
): SignatureMatchInputs | undefined {
  const tsCallExpression = context.services.esTreeNodeToTSNodeMap.get(
    context.callExpression,
  );
  const [firstArgument] = tsCallExpression.arguments;

  if (firstArgument === void 0) {
    return void 0;
  }

  return {
    calleeType: context.checker.getTypeAtLocation(tsCallExpression.expression),
    firstArgument,
    firstArgumentType: context.checker.getTypeAtLocation(firstArgument),
    tsFactoryArgument: context.services.esTreeNodeToTSNodeMap.get(
      context.factoryArgument,
    ),
  };
}

/**
 * Determines whether the object literal still needs an outer cast.
 * @param context Data used to decide whether the full object needs casting.
 * @returns True when the full object still needs casting.
 * @example
 * ```typescript
 * const needsOuterCast = isOuterCastRequired(context);
 * ```
 */
function isOuterCastRequired(context: OuterCastContext): boolean {
  return isOuterCastRequiredImpl(context);
}

/**
 * Resolves the target type the factory object should satisfy.
 * @param context Type-resolution inputs for the current mock factory.
 * @returns Target type for the rewritten object literal.
 * @example
 * ```typescript
 * const targetType = resolveFactoryTargetType(context);
 * ```
 */
function resolveFactoryTargetType(
  context: ResolveFactoryTargetTypeContext,
): ts.Type | undefined {
  return (
    getContextualFactoryTargetType(context) ??
    getSignatureFactoryTargetType(context)
  );
}

export { isOuterCastRequired, resolveFactoryTargetType };
