import { TSESTree } from "@typescript-eslint/utils";

import type {
  FactoryFunctionExpression,
  FactoryMatchInput,
  MockFactoryArguments,
} from "./types";

import {
  getFactoryReturnExpression,
  getModuleSpecifier,
  isVitestMockCall,
  unwrapExpression,
} from "./ast-helpers";

/**
 * Builds normalized match input from a supported factory call.
 * @param mockArguments Supported mock-call arguments.
 * @returns Normalized factory input when the returned value is an object literal.
 * @example
 * ```typescript
 * const factoryInput = buildFactoryMatchInput(mockArguments);
 * ```
 */
function buildFactoryMatchInput(
  mockArguments: MockFactoryArguments,
): FactoryMatchInput | undefined {
  const { factoryArgument, moduleArgument } = mockArguments;
  const moduleSpecifier = getModuleSpecifier(moduleArgument);
  const returnExpression = getFactoryReturnExpression(factoryArgument);

  if (moduleSpecifier === void 0 || returnExpression === void 0) {
    return void 0;
  }

  const objectExpression = unwrapExpression(returnExpression);

  return objectExpression.type === TSESTree.AST_NODE_TYPES.ObjectExpression
    ? {
        factoryArgument,
        moduleSpecifier,
        objectExpression,
        returnExpression,
      }
    : void 0;
}

/**
 * Extracts the mock-factory inputs needed for a rewrite attempt.
 * @param callExpression Call expression to inspect.
 * @returns Normalized factory input when the call is supported.
 * @example
 * ```typescript
 * const factoryInput = getFactoryMatchInput(callExpression);
 * ```
 */
function getFactoryMatchInput(
  callExpression: TSESTree.CallExpression,
): FactoryMatchInput | undefined {
  if (!isVitestMockCall(callExpression)) {
    return void 0;
  }

  const mockArguments = getMockFactoryArguments(callExpression.arguments);

  return mockArguments === void 0
    ? void 0
    : buildFactoryMatchInput(mockArguments);
}

/**
 * Extracts valid mock-factory arguments from a call expression.
 * @param argumentsList Arguments supplied to the mock call.
 * @returns Normalized arguments when the call shape is supported.
 * @example
 * ```typescript
 * const mockArguments = getMockFactoryArguments(callExpression.arguments);
 * ```
 */
function getMockFactoryArguments(
  argumentsList: readonly TSESTree.CallExpressionArgument[],
): MockFactoryArguments | undefined {
  const [moduleArgument, factoryArgument] = argumentsList;

  if (
    moduleArgument === void 0 ||
    factoryArgument === void 0 ||
    moduleArgument.type === TSESTree.AST_NODE_TYPES.SpreadElement ||
    factoryArgument.type === TSESTree.AST_NODE_TYPES.SpreadElement ||
    !isFactoryFunctionExpression(factoryArgument)
  ) {
    return void 0;
  }

  return { factoryArgument, moduleArgument };
}

/**
 * Determines whether an expression is a supported mock factory function.
 * @param expression Expression to inspect.
 * @returns True when the expression is a function compatible with the fixer.
 * @example
 * ```typescript
 * const supported = isFactoryFunctionExpression(expression);
 * ```
 */
function isFactoryFunctionExpression(
  expression: TSESTree.Expression,
): expression is FactoryFunctionExpression {
  return (
    expression.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
    expression.type === TSESTree.AST_NODE_TYPES.FunctionExpression
  );
}

export { getFactoryMatchInput };
