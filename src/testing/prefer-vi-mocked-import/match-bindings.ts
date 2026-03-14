import type * as ESTree from "estree";

import type { Binding, Declaration } from "./types";

import { hasRange } from "./match-helpers";

/**
 * Collects bindings from a mock factory object.
 * @param objectExpression Returned object expression.
 * @param declarations Known declarations by local name.
 * @returns Collected bindings.
 * @example
 * ```typescript
 * const bindings = collectBindings({ properties: [], type: "ObjectExpression" } as never, new Map());
 * void bindings;
 * ```
 */
function collectBindings(
  objectExpression: ESTree.ObjectExpression,
  declarations: Map<string, Declaration>,
): Binding[] {
  return objectExpression.properties
    .map((propertyNode) => toBinding(propertyNode, declarations))
    .filter((binding): binding is Binding => binding !== void 0);
}

/**
 * Converts one object property into a binding when supported.
 * @param propertyNode Object property candidate.
 * @param declarations Known declarations.
 * @returns Binding when property matches the rule shape.
 * @example
 * ```typescript
 * const binding = toBinding({ type: "SpreadElement" } as never, new Map());
 * void binding;
 * ```
 */
function toBinding(
  propertyNode: ESTree.Property | ESTree.SpreadElement,
  declarations: Map<string, Declaration>,
): Binding | undefined {
  if (
    propertyNode.type !== "Property" ||
    propertyNode.key.type !== "Identifier"
  ) {
    return void 0;
  }
  if (
    !hasRange(propertyNode) ||
    !hasRange(propertyNode.key) ||
    propertyNode.value.type !== "Identifier"
  ) {
    return void 0;
  }
  if (
    !hasRange(propertyNode.value) ||
    !declarations.has(propertyNode.value.name)
  ) {
    return void 0;
  }

  return {
    exportedName: propertyNode.key.name,
    localName: propertyNode.value.name,
    propertyKeyRange: propertyNode.key.range,
    propertyRange: propertyNode.range,
    propertyValueRange: propertyNode.value.range,
  };
}

export { collectBindings };
