import type * as ESTree from "estree";

/**
 * Checks whether a value is an ESTree node.
 * @param value The value to test.
 * @returns `true` when value is an ESTree node, `false` otherwise.
 * @example
 * ```typescript
 * isNode({ type: "Identifier" }); // true
 * ```
 */
function isNode(value: unknown): value is ESTree.Node {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (
      value as {
        /** Potential ESTree node type field. */
        type?: unknown;
      }
    ).type === "string"
  );
}

/**
 * Visits an ESTree node graph while ignoring cycles.
 * @param node Input node value.
 * @param callback Input callback value.
 * @param seenNodes Input seenNodes value.
 * @example
 * ```typescript
 * visitNode(node, () => {});
 * ```
 */
function visitNode(
  node: ESTree.Node,
  callback: (node: ESTree.Node) => boolean | undefined,
  seenNodes = new WeakSet<object>(),
): void {
  if (seenNodes.has(node)) {
    return;
  }

  seenNodes.add(node);
  if (callback(node) === false) {
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key !== "parent") {
      visitValue(value, callback, seenNodes);
    }
  }
}

/**
 * Visits child values that may contain nested ESTree nodes.
 * @param value Input value value.
 * @param callback Input callback value.
 * @param seenNodes Input seenNodes value.
 * @example
 * ```typescript
 * visitValue(value, () => {}, new WeakSet<object>());
 * ```
 */
function visitValue(
  value: unknown,
  callback: (node: ESTree.Node) => boolean | undefined,
  seenNodes: WeakSet<object>,
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (isNode(item)) {
        visitNode(item, callback, seenNodes);
      }
    }

    return;
  }

  if (isNode(value)) {
    visitNode(value, callback, seenNodes);
  }
}

export { visitNode };
