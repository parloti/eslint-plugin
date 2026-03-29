/* eslint max-lines: ["error", 320] -- Mandatory multiline JSDoc for these shared helper functions pushes this split file over the default limit. */

import type * as ESTree from "estree";

import type { LocatedComment, SourceComment } from "./types";

/** Array mutator methods that imply observable state changes. */
const arrayMutationMethods = new Set([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift",
]);

/** Names that usually signal Arrange-oriented helper calls. */
const setupLikeNames =
  /^(?:arrange|build|create|fixture|get|given|make|mock|parse|seed|setup|spy|stub|write)/u;

/** Call names that should be treated as utility operations instead of Act steps. */
const utilityMethodNames = new Set([
  "advanceTimersByTime",
  "clearAllMocks",
  "debug",
  "fn",
  "info",
  "join",
  "log",
  "mockImplementation",
  "mockRejectedValue",
  "mockResolvedValue",
  "mockReturnValue",
  "push",
  "resetAllMocks",
  "resolve",
  "useFakeTimers",
  "warn",
]);

/** Method names that usually behave like void side-effect helpers. */
const voidLikeMethodNames = new Set([
  "clear",
  "debug",
  "dispatch",
  "emit",
  "info",
  "log",
  "print",
  "publish",
  "reset",
  "set",
  "trigger",
  "warn",
]);

/** Name pattern used for void-like method detection. */
const voidLikeNamePattern =
  /^(?:clear|debug|dispatch|emit|info|log|print|publish|reset|set|trigger|warn)/u;

/** Object shape used for ESTree node narrowing. */
interface NodeLikeValue {
  /** Potential ESTree node type field. */
  type?: unknown;
}

/**
 * Gets an expression name when it can be resolved statically.
 * @param expression Input expression value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getExpressionName(expression);
 * ```
 */
function getExpressionName(
  expression: ESTree.Expression | ESTree.PrivateIdentifier | ESTree.Super,
): string | undefined {
  if (expression.type === "Super") {
    return void 0;
  }

  if (expression.type === "Identifier") {
    return expression.name;
  }

  if (
    expression.type === "MemberExpression" &&
    expression.property.type === "Identifier"
  ) {
    return expression.property.name;
  }

  return void 0;
}

/**
 * Gets a callee name for a call or construction expression.
 * @param expression Input expression value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getInvokedName(expression);
 * ```
 */
function getInvokedName(
  expression: ESTree.CallExpression | ESTree.NewExpression,
): string | undefined {
  return getExpressionName(expression.callee);
}

/**
 * Checks whether an expression is callable.
 * @param expression Input expression value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isCallableExpression(expression);
 * ```
 */
function isCallableExpression(
  expression: ESTree.Expression | undefined,
): expression is ESTree.CallExpression | ESTree.NewExpression {
  return (
    expression?.type === "CallExpression" ||
    expression?.type === "NewExpression"
  );
}

/**
 * Checks whether a comment has location metadata.
 * @param comment Input comment value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isLocatedComment(comment);
 * ```
 */
function isLocatedComment(comment: SourceComment): comment is LocatedComment {
  return (
    comment.loc !== null && comment.loc !== void 0 && comment.range !== void 0
  );
}

/**
 * Checks whether a value is an ESTree node.
 * @param value Input value value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isNode(value);
 * ```
 */
function isNode(value: unknown): value is ESTree.Node {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as NodeLikeValue).type === "string"
  );
}

/**
 * Checks whether a range is fully contained within another range.
 * @param range Input range value.
 * @param container Input container value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isRangeWithin(range, container);
 * ```
 */
function isRangeWithin(
  range: [number, number],
  container: [number, number],
): boolean {
  return range[0] >= container[0] && range[1] <= container[1];
}

/**
 * Checks whether a constructor call should be treated as setup.
 * @param expression Input expression value.
 * @param calleeName Input calleeName value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isUtilityConstructor(expression, "Map");
 * ```
 */
function isUtilityConstructor(
  expression: ESTree.CallExpression | ESTree.NewExpression,
  calleeName: string,
): boolean {
  return (
    expression.type === "NewExpression" &&
    (calleeName === "Map" ||
      calleeName === "Set" ||
      calleeName === "SourceCode" ||
      calleeName === "ESLint")
  );
}

/**
 * Checks whether a callee name looks utility-like.
 * @param calleeName Input calleeName value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isUtilityNamedCall("setupFixture");
 * ```
 */
function isUtilityNamedCall(calleeName: string): boolean {
  return utilityMethodNames.has(calleeName) || setupLikeNames.test(calleeName);
}

/**
 * Checks whether a call uses a utility namespace.
 * @param expression Input expression value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isUtilityNamespaceCall(expression);
 * ```
 */
function isUtilityNamespaceCall(
  expression: ESTree.CallExpression | ESTree.NewExpression,
): boolean {
  return (
    expression.callee.type === "MemberExpression" &&
    expression.callee.object.type === "Identifier" &&
    ["console", "vi"].includes(expression.callee.object.name)
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
  callback: (node: ESTree.Node) => void,
  seenNodes = new WeakSet<object>(),
): void {
  if (seenNodes.has(node)) {
    return;
  }

  seenNodes.add(node);
  callback(node);

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
  callback: (node: ESTree.Node) => void,
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

export {
  arrayMutationMethods,
  getExpressionName,
  getInvokedName,
  isCallableExpression,
  isLocatedComment,
  isRangeWithin,
  isUtilityConstructor,
  isUtilityNamedCall,
  isUtilityNamespaceCall,
  setupLikeNames,
  utilityMethodNames,
  visitNode,
  voidLikeMethodNames,
  voidLikeNamePattern,
};
