import type * as ESTree from "estree";

/** Type definition for rule data. */
interface OptionalRangeField {
  /** Potential range payload from unknown node-like values. */
  range?: unknown;
}

/** Type definition for rule data. */
type Range = [number, number];

/** Type definition for rule data. */
type RangeNode = ESTree.Node & {
  /** Source range tuple for the node. */
  range: Range;
};

/**
 * Resolves the object literal returned from a mock factory.
 * @param factoryExpression Factory expression from `vi.mock` or `vi.doMock`.
 * @returns Returned object expression when present.
 * @example
 * ```typescript
 * const result = getFactoryReturnObject({ type: "Identifier" } as never);
 * void result;
 * ```
 */
function getFactoryReturnObject(
  factoryExpression: ESTree.Expression,
): ESTree.ObjectExpression | undefined {
  if (factoryExpression.type !== "ArrowFunctionExpression") {
    return void 0;
  }

  const { body } = factoryExpression;
  if (body.type === "ObjectExpression") {
    return body;
  }
  if (body.type !== "BlockStatement") {
    return void 0;
  }

  const returnStatement = body.body.find(
    (statement): statement is ESTree.ReturnStatement =>
      statement.type === "ReturnStatement",
  );
  const returnArgument = returnStatement?.argument;
  return returnArgument?.type === "ObjectExpression" ? returnArgument : void 0;
}

/**
 * Extracts a module specifier string from a mock call argument.
 * @param moduleArgument First argument of `vi.mock` or `vi.doMock`.
 * @returns String module specifier when available.
 * @example
 * ```typescript
 * const specifier = getModuleSpecifier({ type: "Literal", value: "./x" } as never);
 * void specifier;
 * ```
 */
function getModuleSpecifier(
  moduleArgument: ESTree.Expression,
): string | undefined {
  if (moduleArgument.type === "ImportExpression") {
    const { source } = moduleArgument;
    return source.type === "Literal" && typeof source.value === "string"
      ? source.value
      : void 0;
  }

  return moduleArgument.type === "Literal" &&
    typeof moduleArgument.value === "string"
    ? moduleArgument.value
    : void 0;
}

/**
 * Determines the newline sequence used in source text.
 * @param sourceText Full source text.
 * @returns Detected newline sequence.
 * @example
 * ```typescript
 * const newline = getNewline("a\r\nb");
 * void newline;
 * ```
 */
function getNewline(sourceText: string): "\n" | "\r\n" {
  return sourceText.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * Checks whether a node includes a numeric `range` tuple.
 * @param node Node to inspect.
 * @returns True when the node has a valid `range`.
 * @example
 * ```typescript
 * const ok = hasRange({ range: [0, 1] } as never);
 * void ok;
 * ```
 */
function hasRange(node: ESTree.Node): node is RangeNode {
  const rangeValue = (node as unknown as OptionalRangeField).range;
  return (
    Array.isArray(rangeValue) &&
    rangeValue.length === 2 &&
    typeof rangeValue[0] === "number" &&
    typeof rangeValue[1] === "number"
  );
}

/**
 * Returns true when an expression is a `vi.fn(...)` call.
 * @param expression Expression to inspect.
 * @returns True when the expression is a `vi.fn` call.
 * @example
 * ```typescript
 * const ok = isViFunctionCall(null);
 * void ok;
 * ```
 */
function isViFunctionCall(expression: ESTree.Expression | null): boolean {
  if (expression?.type !== "CallExpression") {
    return false;
  }
  if (expression.callee.type !== "MemberExpression") {
    return false;
  }

  const { object, property } = expression.callee;
  return (
    object.type === "Identifier" &&
    object.name === "vi" &&
    property.type === "Identifier" &&
    property.name === "fn"
  );
}

export type { Range };
export {
  getFactoryReturnObject,
  getModuleSpecifier,
  getNewline,
  hasRange,
  isViFunctionCall,
};
