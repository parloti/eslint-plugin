import type * as ESTree from "estree";

/**
 * Returns child nodes for a given AST node.
 * @param node Source node.
 * @returns Flattened list of child nodes.
 * @example
 * ```typescript
 * const childNodes = getChildNodes({ type: "Program", body: [], sourceType: "module" } as never);
 * void childNodes;
 * ```
 */
function getChildNodes(node: ESTree.Node): ESTree.Node[] {
  const values = Object.entries(node as unknown as Record<string, unknown>)
    .filter(([key]) => key !== "parent")
    .map(([, value]) => value);
  return values.flatMap((value) => toNodeList(value));
}

/**
 * Checks whether a value is an ESTree node.
 * @param value Arbitrary value from node property iteration.
 * @returns True when the value has node-like shape.
 * @example
 * ```typescript
 * const ok = isNode({ type: "Identifier", name: "x" });
 * void ok;
 * ```
 */
function isNode(value: unknown): value is ESTree.Node {
  return typeof value === "object" && value !== null && "type" in value;
}

/**
 * Converts an unknown value into a list of AST nodes.
 * @param value Arbitrary value from the AST object graph.
 * @returns Node list extracted from arrays or single values.
 * @example
 * ```typescript
 * const list = toNodeList([{ type: "Identifier", name: "x" }] as never);
 * void list;
 * ```
 */
function toNodeList(value: unknown): ESTree.Node[] {
  if (Array.isArray(value)) {
    return value.filter((nodeValue): nodeValue is ESTree.Node =>
      isNode(nodeValue),
    );
  }

  return isNode(value) ? [value] : [];
}

/**
 * Visits a node and all nested child nodes.
 * @param node Root node to visit.
 * @param visitor Callback run for each visited node.
 * @example
 * ```typescript
 * walkNode({ type: "Program", body: [], sourceType: "module" } as never, () => {});
 * ```
 */
function walkNode(
  node: ESTree.Node,
  visitor: (currentNode: ESTree.Node) => void,
): void {
  visitor(node);
  for (const childNode of getChildNodes(node)) {
    walkNode(childNode, visitor);
  }
}

export { walkNode };
