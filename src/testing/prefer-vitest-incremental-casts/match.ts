import type {
  BuildMatchResultContext,
  BuildPropertyReplacementContext,
  CollectMatchContext,
  CollectPropertyReplacementsContext,
  MatchResult,
  PropertyReplacement,
  PropertyReplacementCollection,
  SupportedProperty,
  TargetPropertyMap,
} from "./types";

import {
  getPropertyName,
  isSupportedProperty,
  shouldWrapImplicitObject,
} from "./ast-helpers";
import { getFactoryMatchInput } from "./match-input";
import {
  applyTextReplacements,
  buildPropertyReplacement,
} from "./replacement-helpers";
import { isOuterCastRequired, resolveFactoryTargetType } from "./type-helpers";

/**
 * Records one property replacement when the source text must change.
 * @param propertyNames Property names already handled for the object literal.
 * @param replacements Replacement entries collected so far.
 * @param replacementContext Replacement context for the current property.
 * @example
 * ```typescript
 * appendPropertyReplacement(new Set(), [], replacementContext);
 * ```
 */
function appendPropertyReplacement(
  propertyNames: Set<string>,
  replacements: PropertyReplacement[],
  replacementContext: BuildPropertyReplacementContext,
): void {
  propertyNames.add(replacementContext.keyName);

  const replacement = buildPropertyReplacement(replacementContext);

  if (replacement !== void 0) {
    replacements.push(replacement);
  }
}

/**
 * Builds the final match result for a rewritten object literal.
 * @param context Data required to build the final replacement.
 * @returns Final match result when the object text changes.
 * @example
 * ```typescript
 * const match = buildMatchResult(context);
 * ```
 */
function buildMatchResult(
  context: BuildMatchResultContext,
): MatchResult | undefined {
  const objectText = applyTextReplacements(
    context.sourceText.slice(
      context.objectExpression.range[0],
      context.objectExpression.range[1],
    ),
    context.replacements,
    context.objectExpression.range[0],
  );
  const replacementText = createReplacementText(context, objectText);
  const originalText = context.sourceText.slice(
    context.returnExpression.range[0],
    context.returnExpression.range[1],
  );

  return originalText === replacementText
    ? void 0
    : {
        replacementText,
        returnExpressionRange: context.returnExpression.range,
      };
}

/**
 * Collects nested replacements for all supported object literal properties.
 * @param context Data required to analyze supported object properties.
 * @param properties Supported object literal properties to rewrite.
 * @returns Property replacements when every property can be handled safely.
 * @example
 * ```typescript
 * const collection = buildPropertyReplacementCollection(context, properties);
 * ```
 */
function buildPropertyReplacementCollection(
  context: CollectPropertyReplacementsContext,
  properties: readonly SupportedProperty[],
): PropertyReplacementCollection | undefined {
  const propertyNames = new Set<string>();
  const replacements: PropertyReplacement[] = [];
  const targetProperties = createTargetPropertyMap(context);

  for (const property of properties) {
    const replacementContext = createPropertyReplacementContext(
      context,
      property,
      targetProperties,
    );

    if (replacementContext === void 0) {
      return void 0;
    }

    appendPropertyReplacement(propertyNames, replacements, replacementContext);
  }

  return { propertyNames, replacements };
}

/**
 * Collects a fix match for a supported Vitest mock factory call.
 * @param context Match collection context.
 * @returns Match result when the object literal can be safely rewritten.
 * @example
 * ```typescript
 * const match = collectMatch(context);
 * ```
 */
function collectMatch(context: CollectMatchContext): MatchResult | undefined {
  const factoryMatchInput = getFactoryMatchInput(context.callExpression);

  if (factoryMatchInput === void 0) {
    return void 0;
  }

  const targetType = resolveFactoryTargetType({
    callExpression: context.callExpression,
    checker: context.checker,
    factoryArgument: factoryMatchInput.factoryArgument,
    objectExpression: factoryMatchInput.objectExpression,
    services: context.services,
  });

  if (targetType === void 0) {
    return void 0;
  }

  const collectedReplacements = collectPropertyReplacements({
    checker: context.checker,
    moduleSpecifier: factoryMatchInput.moduleSpecifier,
    objectExpression: factoryMatchInput.objectExpression,
    services: context.services,
    sourceText: context.sourceText,
    targetType,
  });

  return collectedReplacements === void 0
    ? void 0
    : buildMatchResult({
        checker: context.checker,
        factoryArgument: factoryMatchInput.factoryArgument,
        moduleSpecifier: factoryMatchInput.moduleSpecifier,
        objectExpression: factoryMatchInput.objectExpression,
        propertyNames: collectedReplacements.propertyNames,
        replacements: collectedReplacements.replacements,
        returnExpression: factoryMatchInput.returnExpression,
        sourceText: context.sourceText,
        targetType,
      });
}

/**
 * Collects nested replacements for all supported object literal properties.
 * @param context Data required to analyze supported object properties.
 * @returns Property replacements when every property can be handled safely.
 * @example
 * ```typescript
 * const collection = collectPropertyReplacements(context);
 * ```
 */
function collectPropertyReplacements(
  context: CollectPropertyReplacementsContext,
): PropertyReplacementCollection | undefined {
  const properties = context.objectExpression.properties.filter((property) =>
    isSupportedProperty(property),
  );

  return properties.length === context.objectExpression.properties.length
    ? buildPropertyReplacementCollection(context, properties)
    : void 0;
}

/**
 * Creates replacement inputs for one supported object literal property.
 * @param context Data required to analyze supported object properties.
 * @param property Supported property from the returned object literal.
 * @param targetProperties Target-property lookup keyed by property name.
 * @returns Replacement inputs when the property can be handled safely.
 * @example
 * ```typescript
 * const replacementContext = createPropertyReplacementContext(context, property, targetProperties);
 * ```
 */
function createPropertyReplacementContext(
  context: CollectPropertyReplacementsContext,
  property: SupportedProperty,
  targetProperties: TargetPropertyMap,
): BuildPropertyReplacementContext | undefined {
  const keyName = getPropertyName(property.key);
  const targetPropertySymbol =
    keyName === void 0 ? void 0 : targetProperties.get(keyName);

  return keyName === void 0 || targetPropertySymbol === void 0
    ? void 0
    : {
        checker: context.checker,
        keyName,
        moduleSpecifier: context.moduleSpecifier,
        property,
        services: context.services,
        sourceText: context.sourceText,
        targetPropertySymbol,
      };
}

/**
 * Creates the final replacement text for the returned object expression.
 * @param context Data required to build the final replacement.
 * @param objectText Rewritten object literal text.
 * @returns Final replacement text for the factory return expression.
 * @example
 * ```typescript
 * const text = createReplacementText(context, "({})");
 * ```
 */
function createReplacementText(
  context: BuildMatchResultContext,
  objectText: string,
): string {
  if (
    isOuterCastRequired({
      checker: context.checker,
      propertyNames: context.propertyNames,
      targetType: context.targetType,
    })
  ) {
    return `(${objectText}) as typeof import(${JSON.stringify(context.moduleSpecifier)})`;
  }

  return shouldWrapImplicitObject(
    context.factoryArgument,
    context.returnExpression,
    context.objectExpression,
  )
    ? `(${objectText})`
    : objectText;
}

/**
 * Builds the lookup of target properties from the inferred target type.
 * @param context Data required to analyze supported object properties.
 * @returns Target-property lookup keyed by property name.
 * @example
 * ```typescript
 * const targetProperties = createTargetPropertyMap(context);
 * ```
 */
function createTargetPropertyMap(
  context: CollectPropertyReplacementsContext,
): TargetPropertyMap {
  return new Map(
    context.checker
      .getPropertiesOfType(context.targetType)
      .map((propertySymbol) => [propertySymbol.getName(), propertySymbol]),
  );
}

export { collectMatch };
