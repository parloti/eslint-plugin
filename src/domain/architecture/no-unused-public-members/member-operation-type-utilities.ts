import type * as ts from "typescript";

interface UsageTypes {
  contextual: WeakMap<ts.Expression, ts.Type | undefined>;
  nodes: WeakMap<ts.Node, ts.Type>;
  properties: WeakMap<ts.Type, ts.Symbol[]>;
}

const usageTypes = new WeakMap<ts.TypeChecker, UsageTypes>();

const getUsageTypes = (checker: ts.TypeChecker): UsageTypes => {
  let facts = usageTypes.get(checker);
  if (facts === void 0) {
    facts = {
      contextual: new WeakMap(),
      nodes: new WeakMap(),
      properties: new WeakMap(),
    };
    usageTypes.set(checker, facts);
  }
  return facts;
};

/**
 * Resolves an immutable node type once per semantic snapshot.
 * @param node Type-bearing syntax node.
 * @param checker Active semantic checker.
 * @returns Resolved node type.
 * @example
 * ```typescript
 * const type = getUsageType(expression, checker);
 * ```
 */
const getUsageType = (node: ts.Node, checker: ts.TypeChecker): ts.Type => {
  const facts = getUsageTypes(checker);
  let type = facts.nodes.get(node);
  if (type === void 0) {
    type = checker.getTypeAtLocation(node);
    facts.nodes.set(node, type);
  }
  return type;
};

/**
 * Shares contextual type queries, including an absent context.
 * @param node Expression whose receiving contract is requested.
 * @param checker Active semantic checker.
 * @returns Contextual contract when present.
 * @example
 * ```typescript
 * const type = getUsageContextualType(argument, checker);
 * ```
 */
const getUsageContextualType = (
  node: ts.Expression,
  checker: ts.TypeChecker,
): ts.Type | undefined => {
  const facts = getUsageTypes(checker);
  if (!facts.contextual.has(node)) {
    facts.contextual.set(node, checker.getContextualType(node));
  }
  return facts.contextual.get(node);
};

/**
 * Shares property enumeration without expanding signatures or changing identity.
 * @param type Object type being inspected.
 * @param checker Active semantic checker.
 * @returns Properties in TypeScript's original order.
 * @example
 * ```typescript
 * const properties = getUsageProperties(type, checker);
 * ```
 */
const getUsageProperties = (
  type: ts.Type,
  checker: ts.TypeChecker,
): readonly ts.Symbol[] => {
  const facts = getUsageTypes(checker);
  let properties = facts.properties.get(type);
  if (properties === void 0) {
    properties = checker.getPropertiesOfType(type);
    facts.properties.set(type, properties);
  }
  return properties;
};

export { getUsageContextualType, getUsageProperties, getUsageType };
