import type * as ESTree from "estree";

import type { LocatedComment, SourceComment } from "./types";

import { visitNode as visitNodeImplementation } from "./analyzer.super.helpers";

/**
 * Creates a local forwarding function for an imported analyzer helper.
 * @template TParameters Forwarded parameter tuple.
 * @template TResult Forwarded return type.
 * @param implementation Imported helper implementation.
 * @returns Local function that forwards all arguments to the implementation.
 * @example
 * ```typescript
 * const localHelper = forward(implementation);
 * ```
 */
function forward<TParameters extends unknown[], TResult>(
  implementation: (...parameters: TParameters) => TResult,
): (...parameters: TParameters) => TResult {
  return (...parameters) => implementation(...parameters);
}

/** Visits an ESTree node graph while ignoring cycles. */
const visitNode = forward(visitNodeImplementation);

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
  "flush",
  "info",
  "log",
  "print",
  "publish",
  "reset",
  "set",
  "trigger",
  "warn",
]);

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
 * Splits an identifier into lowercase word tokens.
 * @param identifier Input identifier value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getNameWords("scheduleAndFlush");
 * ```
 */
function getNameWords(identifier: string): string[] {
  return identifier
    .split(/(?=[A-Z])|[_-]/u)
    .map((segment) => segment.toLowerCase())
    .filter((segment) => segment.length > 0);
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
    (calleeName === "Error" ||
      calleeName === "Map" ||
      calleeName === "Set" ||
      calleeName === "SourceCode" ||
      calleeName === "ESLint" ||
      calleeName === "WeakMap" ||
      calleeName === "WeakSet")
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
 * Checks whether a call name is built from void-like verb tokens.
 * @param calleeName Input calleeName value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isVoidLikeMethodName("scheduleAndFlush");
 * ```
 */
function isVoidLikeMethodName(calleeName: string): boolean {
  return getNameWords(calleeName).some((word) => voidLikeMethodNames.has(word));
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
  isVoidLikeMethodName,
  setupLikeNames,
  utilityMethodNames,
  visitNode,
  voidLikeMethodNames,
};
