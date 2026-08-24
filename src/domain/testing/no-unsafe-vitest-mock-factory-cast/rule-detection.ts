import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

/** Unsafe mock-factory match details. */
interface MockFactoryMatch {
  /** Whether the match can be safely autofixed. */
  canAutofix: boolean;

  /** Cast-free partial mock expression. */
  mockExpression: TSESTree.Expression;

  /** Second argument to the Vitest mock call. */
  mockFactoryNode:
    TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression;

  /** First argument to the Vitest mock call. */
  mockSpecifierNode: TSESTree.Expression;

  /** Mocked module specifier. */
  moduleSpecifier: string;

  /** Report node. */
  node: TSESTree.Node;
}

/** Supported `vi` mock method names. */
const supportedMockNames = new Set(["doMock", "mock"]);

/** CallExpression argument that is not a spread element. */
type NonSpreadCallExpressionArgument = Exclude<
  TSESTree.CallExpressionArgument,
  TSESTree.SpreadElement
>;

/**
 * Returns the casted expression only when the factory is safe to autofix.
 * @param node Factory expression to inspect.
 * @returns Cast-free expression when the factory can be safely replaced.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getAutofixableMockExpression(
  node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): TSESTree.Expression | undefined {
  if (node.type === AST_NODE_TYPES.ArrowFunctionExpression) {
    if (node.async || node.params.length > 0) {
      return void 0;
    }

    if (node.body.type === AST_NODE_TYPES.BlockStatement) {
      return getAutofixableReturnedCastedExpression(node.body.body);
    }

    return getCastedExpression(node.body);
  }

  if (node.async || node.generator || node.params.length > 0) {
    return void 0;
  }

  return getAutofixableReturnedCastedExpression(node.body.body);
}

/**
 * Finds a casted return value from a single-return factory body.
 * @param statements Function body statements.
 * @returns Returned expression when the factory has exactly one return statement.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getAutofixableReturnedCastedExpression(
  statements: TSESTree.Statement[],
): TSESTree.Expression | undefined {
  if (statements.length !== 1) {
    return void 0;
  }

  const [statement] = statements as [TSESTree.ReturnStatement];
  if (statement.argument === null) {
    return void 0;
  }

  return getCastedExpression(statement.argument);
}

/**
 * Returns the inner expression if the input is a cast expression.
 * @param expression Expression to inspect.
 * @returns Inner expression when the input contains a cast.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getCastedExpression(
  expression: TSESTree.Expression,
): TSESTree.Expression | undefined {
  if (expression.type === AST_NODE_TYPES.TSAsExpression) {
    return stripCastExpressions(expression.expression);
  }

  if (expression.type === AST_NODE_TYPES.TSTypeAssertion) {
    const innerExpression = expression.expression;
    return stripCastExpressions(innerExpression);
  }

  return void 0;
}

/**
 * Returns the partial mock expression after removing a cast wrapper.
 * @param node Factory expression to inspect.
 * @returns Cast-free expression when the factory is unsafe.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getCastedMockExpression(
  node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): TSESTree.Expression | undefined {
  if (node.type === AST_NODE_TYPES.ArrowFunctionExpression) {
    if (node.body.type === AST_NODE_TYPES.BlockStatement) {
      return getReturnedCastedExpression(node.body.body);
    }

    return getCastedExpression(node.body);
  }

  return getReturnedCastedExpression(node.body.body);
}

/**
 * Collects the most appropriate mock-factory match from a `CallExpression`.
 * @param node Call expression to inspect.
 * @returns Unsafe mock factory details when the factory uses a cast.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getMockFactoryMatch(
  node: TSESTree.CallExpression,
): MockFactoryMatch | undefined {
  if (!isVitestMockCall(node) || node.arguments.length < 2) {
    return void 0;
  }

  const [mockSpecifierNode, mockFactoryNode] = node.arguments as [
    TSESTree.CallExpressionArgument,
    TSESTree.CallExpressionArgument,
    ...TSESTree.CallExpressionArgument[],
  ];

  if (
    mockSpecifierNode.type === AST_NODE_TYPES.SpreadElement ||
    mockFactoryNode.type === AST_NODE_TYPES.SpreadElement
  ) {
    return void 0;
  }

  if (
    mockFactoryNode.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
    mockFactoryNode.type !== AST_NODE_TYPES.FunctionExpression
  ) {
    return void 0;
  }

  const moduleSpecifier = getModuleSpecifier(mockSpecifierNode);
  if (moduleSpecifier === void 0) {
    return void 0;
  }

  const mockExpression = getCastedMockExpression(mockFactoryNode);
  if (mockExpression === void 0) {
    return void 0;
  }

  const autofixableExpression = getAutofixableMockExpression(mockFactoryNode);

  return {
    canAutofix: autofixableExpression !== void 0,
    mockExpression: autofixableExpression ?? mockExpression,
    mockFactoryNode,
    mockSpecifierNode,
    moduleSpecifier,
    node,
  };
}

/**
 * Extracts a string module specifier from the first mock argument.
 * @param node First mock argument.
 * @returns Module specifier when statically known.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getModuleSpecifier(
  node: NonSpreadCallExpressionArgument,
): string | undefined {
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === "string") {
    return node.value;
  }

  if (
    node.type === AST_NODE_TYPES.ImportExpression &&
    node.source.type === AST_NODE_TYPES.Literal &&
    typeof node.source.value === "string"
  ) {
    return node.source.value;
  }

  return void 0;
}

/**
 * Finds the casted return value inside a function body.
 * @param statements Function body statements.
 * @returns Returned expression when it is casted.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getReturnedCastedExpression(
  statements: TSESTree.Statement[],
): TSESTree.Expression | undefined {
  for (const statement of statements) {
    if (statement.type !== AST_NODE_TYPES.ReturnStatement) {
      continue;
    }

    return statement.argument === null
      ? void 0
      : getCastedExpression(statement.argument);
  }

  return void 0;
}

/**
 * Checks whether a call targets `vi.mock` or `vi.doMock`.
 * @param node Call expression to inspect.
 * @returns True when the callee is a supported Vitest mock method.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function isVitestMockCall(node: TSESTree.CallExpression): boolean {
  if (
    node.callee.type !== AST_NODE_TYPES.MemberExpression ||
    node.callee.object.type !== AST_NODE_TYPES.Identifier ||
    node.callee.object.name !== "vi" ||
    node.callee.property.type !== AST_NODE_TYPES.Identifier
  ) {
    return false;
  }

  return supportedMockNames.has(node.callee.property.name);
}

/**
 * Removes nested cast wrappers from an expression.
 * @param expression Expression to normalize.
 * @returns Expression without any surrounding casts.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function stripCastExpressions(
  expression: TSESTree.Expression,
): TSESTree.Expression {
  let currentExpression = expression;

  while (
    currentExpression.type === AST_NODE_TYPES.TSAsExpression ||
    currentExpression.type === AST_NODE_TYPES.TSTypeAssertion
  ) {
    currentExpression = currentExpression.expression;
  }

  return currentExpression;
}

export type { MockFactoryMatch };
export { getMockFactoryMatch };
