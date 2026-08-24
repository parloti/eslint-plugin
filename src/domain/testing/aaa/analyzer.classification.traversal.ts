import type * as ESTree from "estree";

import { visitNode } from "./analyzer.super.helpers";

/**
 * Checks whether a node introduces deferred execution.
 * @param node Input node value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isDeferredFunctionNode({ type: "ArrowFunctionExpression" } as ESTree.Node);
 * ```
 */
function isDeferredFunctionNode(node: ESTree.Node): boolean {
  return [
    "ArrowFunctionExpression",
    "FunctionDeclaration",
    "FunctionExpression",
  ].includes(node.type);
}

/**
 * Visits a statement while skipping nested function bodies that execute later.
 * @param statement Input statement value.
 * @param callback Input callback value.
 * @example
 * ```typescript
 * visitStatementWithoutDeferredBodies(statement, () => {});
 * ```
 */
function visitStatementWithoutDeferredBodies(
  statement: ESTree.Statement,
  callback: (node: ESTree.Node) => void,
): void {
  visitNode(statement, (node) => {
    callback(node);
    return node === statement || !isDeferredFunctionNode(node);
  });
}

export { visitStatementWithoutDeferredBodies };
