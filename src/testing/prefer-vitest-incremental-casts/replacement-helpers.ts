import type {
  BuildPropertyReplacementContext,
  PropertyReplacement,
} from "./types";

import { canUseShorthand, unwrapExpression } from "./ast-helpers";

/**
 * Applies the collected property replacements in reverse source order.
 * @param text Original object literal source text.
 * @param replacements Replacement operations for the object literal.
 * @param offset Absolute start offset of the object literal.
 * @returns Updated object literal source text.
 * @example
 * ```typescript
 * const objectText = applyTextReplacements(text, replacements, offset);
 * ```
 */
function applyTextReplacements(
  text: string,
  replacements: readonly PropertyReplacement[],
  offset: number,
): string {
  let currentText = text;

  for (const replacement of replacements.toSorted(
    (left, right) => right.range[0] - left.range[0],
  )) {
    const start = replacement.range[0] - offset;
    const end = replacement.range[1] - offset;

    currentText = `${currentText.slice(0, start)}${replacement.replacementText}${currentText.slice(end)}`;
  }

  return currentText;
}

/**
 * Builds the replacement entry when a property's source text must change.
 * @param context Data needed to rewrite one supported object property.
 * @returns Replacement details when the property text changes.
 * @example
 * ```typescript
 * const replacement = buildPropertyReplacement(context);
 * ```
 */
function buildPropertyReplacement(
  context: BuildPropertyReplacementContext,
): PropertyReplacement | undefined {
  const replacementText = buildReplacementText(context);
  const propertyRange = context.property.range;
  const originalText = context.sourceText.slice(
    propertyRange[0],
    propertyRange[1],
  );

  return originalText === replacementText
    ? void 0
    : { range: propertyRange, replacementText };
}

/**
 * Builds the final source text for one object literal property.
 * @param context Property replacement context.
 * @returns Rewritten property text.
 * @example
 * ```typescript
 * const replacementText = buildReplacementText(context);
 * ```
 */
function buildReplacementText(
  context: BuildPropertyReplacementContext,
): string {
  const { keyName, moduleSpecifier, property, sourceText } = context;
  const baseValue = unwrapExpression(property.value);
  const baseValueText = sourceText.slice(
    baseValue.range[0],
    baseValue.range[1],
  );
  const keyText = sourceText.slice(
    property.key.range[0],
    property.key.range[1],
  );
  const needsCast = isPropertyCastRequired(context, baseValue);
  const valueText = needsCast
    ? `${baseValueText} as ${getPropertyTypeText(moduleSpecifier, keyName)}`
    : baseValueText;

  return canUseShorthand({ baseValue, keyName, needsCast, property })
    ? keyName
    : `${keyText}: ${valueText}`;
}

/**
 * Builds the imported property type expression used for a nested cast.
 * @param moduleSpecifier Static module specifier used by the mock.
 * @param keyName Property name being cast.
 * @returns Type expression for the imported property.
 * @example
 * ```typescript
 * const propertyType = getPropertyTypeText("fixture-module", "parser");
 * ```
 */
function getPropertyTypeText(moduleSpecifier: string, keyName: string): string {
  return `typeof import(${JSON.stringify(moduleSpecifier)})[${JSON.stringify(keyName)}]`;
}

/**
 * Determines whether a property value still needs a nested cast.
 * @param context Property replacement context.
 * @param baseValue Unwrapped property value expression.
 * @returns True when the property value is not assignable to the target type.
 * @example
 * ```typescript
 * const needsCast = isPropertyCastRequired(context, baseValue);
 * ```
 */
function isPropertyCastRequired(
  context: BuildPropertyReplacementContext,
  baseValue: BuildPropertyReplacementContext["property"]["value"],
): boolean {
  const tsBaseValueNode = context.services.esTreeNodeToTSNodeMap.get(baseValue);
  const tsPropertyKeyNode = context.services.esTreeNodeToTSNodeMap.get(
    context.property.key,
  );
  const sourceType = context.checker.getTypeAtLocation(tsBaseValueNode);
  const propertyTargetType = context.checker.getTypeOfSymbolAtLocation(
    context.targetPropertySymbol,
    tsPropertyKeyNode,
  );

  return !context.checker.isTypeAssignableTo(sourceType, propertyTargetType);
}

export { applyTextReplacements, buildPropertyReplacement };
