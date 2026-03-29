import { TSESTree } from "@typescript-eslint/utils";

import type { ShorthandContext, SupportedProperty } from "./types";

/**
 * Checks whether a property can remain in shorthand form after replacement.
 * @param context Property shorthand decision context.
 * @returns True when shorthand syntax remains valid.
 * @example
 * ```typescript
 * const keepShorthand = canUseShorthand(context);
 * ```
 */
function canUseShorthand(context: ShorthandContext): boolean {
  const { baseValue, keyName, needsCast, property } = context;

  return (
    !needsCast &&
    baseValue.type === TSESTree.AST_NODE_TYPES.Identifier &&
    property.key.type === TSESTree.AST_NODE_TYPES.Identifier &&
    property.key.name === keyName &&
    baseValue.name === keyName
  );
}

/**
 * Resolves the expression returned by the mock factory.
 * @param factoryArgument Mock factory function expression.
 * @returns Returned expression when one is present.
 * @example
 * ```typescript
 * const returnExpression = getFactoryReturnExpression(factoryArgument);
 * ```
 */
function getFactoryReturnExpression(
  factoryArgument:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression,
): TSESTree.Expression | undefined {
  if (factoryArgument.body.type !== TSESTree.AST_NODE_TYPES.BlockStatement) {
    return factoryArgument.body;
  }

  const returnStatement = factoryArgument.body.body.find(
    (statement): statement is TSESTree.ReturnStatement =>
      statement.type === TSESTree.AST_NODE_TYPES.ReturnStatement &&
      statement.argument !== null,
  );

  return returnStatement?.argument ?? void 0;
}

/**
 * Extracts the module specifier from a mock call argument.
 * @param moduleArgument Import expression or string literal argument.
 * @returns Static module specifier when it can be determined.
 * @example
 * ```typescript
 * const moduleSpecifier = getModuleSpecifier(moduleArgument);
 * ```
 */
function getModuleSpecifier(
  moduleArgument: TSESTree.Expression,
): string | undefined {
  if (moduleArgument.type === TSESTree.AST_NODE_TYPES.ImportExpression) {
    const { source } = moduleArgument;

    if (
      source.type === TSESTree.AST_NODE_TYPES.Literal &&
      typeof source.value === "string"
    ) {
      return source.value;
    }

    return void 0;
  }

  return moduleArgument.type === TSESTree.AST_NODE_TYPES.Literal &&
    typeof moduleArgument.value === "string"
    ? moduleArgument.value
    : void 0;
}

/**
 * Converts an object property key node into a stable string name.
 * @param propertyKey Property key node from the object literal.
 * @returns Property name when the key is statically known.
 * @example
 * ```typescript
 * const propertyName = getPropertyName(property.key);
 * ```
 */
function getPropertyName(
  propertyKey: TSESTree.PropertyName,
): string | undefined {
  if (propertyKey.type === TSESTree.AST_NODE_TYPES.Identifier) {
    return propertyKey.name;
  }

  if (propertyKey.type === TSESTree.AST_NODE_TYPES.Literal) {
    return typeof propertyKey.value === "string" ||
      typeof propertyKey.value === "number"
      ? String(propertyKey.value)
      : void 0;
  }

  return void 0;
}

/**
 * Narrows object literal elements to the subset the fixer can rewrite safely.
 * @param property Object literal element to inspect.
 * @returns True when the property is supported by the fixer.
 * @example
 * ```typescript
 * const supported = isSupportedProperty(property);
 * ```
 */
function isSupportedProperty(
  property: TSESTree.ObjectLiteralElement,
): property is SupportedProperty {
  return (
    property.type === TSESTree.AST_NODE_TYPES.Property &&
    !property.computed &&
    property.kind === "init" &&
    !property.method &&
    property.value.type !== TSESTree.AST_NODE_TYPES.AssignmentPattern
  );
}

/**
 * Detects `vi.mock(...)` and `vi.doMock(...)` calls.
 * @param node Call expression being inspected.
 * @returns True when the call targets a Vitest mock factory.
 * @example
 * ```typescript
 * const isMockCall = isVitestMockCall(callExpression);
 * ```
 */
function isVitestMockCall(node: TSESTree.CallExpression): boolean {
  if (node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
    return false;
  }

  const { object, property } = node.callee;

  return (
    object.type === TSESTree.AST_NODE_TYPES.Identifier &&
    object.name === "vi" &&
    property.type === TSESTree.AST_NODE_TYPES.Identifier &&
    (property.name === "mock" || property.name === "doMock")
  );
}

/**
 * Determines whether the fixed object literal must be parenthesized.
 * @param factoryArgument Mock factory function expression.
 * @param returnExpression Expression returned by the factory.
 * @param objectExpression Object literal being rewritten.
 * @returns True when parentheses are required around the object literal.
 * @example
 * ```typescript
 * const wrapObject = shouldWrapImplicitObject(factoryArgument, returnExpression, objectExpression);
 * ```
 */
function shouldWrapImplicitObject(
  factoryArgument:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression,
  returnExpression: TSESTree.Expression,
  objectExpression: TSESTree.ObjectExpression,
): boolean {
  return (
    factoryArgument.body.type !== TSESTree.AST_NODE_TYPES.BlockStatement &&
    (returnExpression.range[0] !== objectExpression.range[0] ||
      returnExpression.range[1] !== objectExpression.range[1])
  );
}

/**
 * Removes surrounding cast wrappers from an expression.
 * @param expression Expression to unwrap.
 * @returns The innermost non-cast expression.
 * @example
 * ```typescript
 * const baseExpression = unwrapExpression(expression);
 * ```
 */
function unwrapExpression(
  expression: TSESTree.Expression,
): TSESTree.Expression {
  let currentExpression = expression;

  while (
    currentExpression.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
    currentExpression.type === TSESTree.AST_NODE_TYPES.TSSatisfiesExpression ||
    currentExpression.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion
  ) {
    currentExpression = currentExpression.expression;
  }

  return currentExpression;
}

export {
  canUseShorthand,
  getFactoryReturnExpression,
  getModuleSpecifier,
  getPropertyName,
  isSupportedProperty,
  isVitestMockCall,
  shouldWrapImplicitObject,
  unwrapExpression,
};
