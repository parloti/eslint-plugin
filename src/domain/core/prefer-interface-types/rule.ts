import type { Rule } from "eslint";

import type {
  TypeAnnotationNode,
  VariableDeclaratorNode,
} from "./rule-utilities";

import {
  getInlineObjectTypeLiteral,
  getParameters,
  getReturnTypeAnnotation,
  getTypeAnnotationNode,
} from "./rule-utilities";

/**
 * Reports an inline object type annotation.
 * @param context Rule execution context.
 * @param typeAnnotation Type annotation node to report.
 * @example
 * ```typescript
 * reportTypeLiteral(context, typeAnnotation);
 * ```
 */
const reportTypeLiteral = (
  context: Rule.RuleContext,
  typeAnnotation: TypeAnnotationNode,
): void => {
  context.report({
    messageId: "preferNamedObject",
    node: typeAnnotation as unknown as Rule.Node,
  });
};

/**
 * Checks function-like nodes for inline object types.
 * @param context Rule execution context.
 * @param node Function-like node to check.
 * @example
 * ```typescript
 * checkFunctionLike(context, node);
 * ```
 */
const checkFunctionLike = (
  context: Rule.RuleContext,
  node: Rule.Node,
): void => {
  for (const parameter of getParameters(node)) {
    const inlineObjectType = getInlineObjectTypeLiteral(
      getTypeAnnotationNode(parameter),
    );

    if (inlineObjectType !== void 0) {
      reportTypeLiteral(context, inlineObjectType);
    }
  }

  const inlineReturnObjectType = getInlineObjectTypeLiteral(
    getReturnTypeAnnotation(node),
  );

  if (inlineReturnObjectType !== void 0) {
    reportTypeLiteral(context, inlineReturnObjectType);
  }
};

/**
 * Checks variable declarators for inline object types.
 * @param context Rule execution context.
 * @param node Variable declarator to check.
 * @example
 * ```typescript
 * checkVariableDeclarator(context, node);
 * ```
 */
const checkVariableDeclarator = (
  context: Rule.RuleContext,
  node: Rule.Node,
): void => {
  const typedNode = node as VariableDeclaratorNode;

  const inlineObjectType = getInlineObjectTypeLiteral(
    getTypeAnnotationNode(typedNode.id),
  );

  if (inlineObjectType !== void 0) {
    reportTypeLiteral(context, inlineObjectType);
  }
};

/** ESLint rule requiring named interface/type aliases for object types. */
const preferInterfaceTypesRule: Rule.RuleModule = {
  /**
   * Creates listeners that validate function-like and variable annotations.
   * @param context Rule execution context.
   * @returns Rule listener map.
   * @example
   * ```typescript
   * const listeners = preferInterfaceTypesRule.create(context);
   * ```
   */
  create(context: Rule.RuleContext): Rule.RuleListener {
    /**
     * Checks function-like nodes for inline object types.
     * @param node Function-like node to inspect.
     * @example
     * ```typescript
     * functionLikeListener(node);
     * ```
     */
    const functionLikeListener = (node: Rule.Node): void => {
      checkFunctionLike(context, node);
    };

    /**
     * Checks variable declarators for inline object types.
     * @param node Variable declarator to inspect.
     * @example
     * ```typescript
     * variableDeclaratorListener(node);
     * ```
     */
    const variableDeclaratorListener = (node: Rule.Node): void => {
      checkVariableDeclarator(context, node);
    };

    return {
      ArrowFunctionExpression: functionLikeListener,
      FunctionDeclaration: functionLikeListener,
      FunctionExpression: functionLikeListener,
      TSCallSignatureDeclaration: functionLikeListener,
      TSConstructSignatureDeclaration: functionLikeListener,
      TSDeclareFunction: functionLikeListener,
      TSFunctionType: functionLikeListener,
      TSMethodSignature: functionLikeListener,
      VariableDeclarator: variableDeclaratorListener,
    };
  },
  meta: {
    docs: {
      description:
        "Require named interfaces or type aliases for object types in parameters, return types, and variable annotations.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/prefer-interface-types.md",
    },
    messages: {
      preferNamedObject:
        "Use a named interface or type alias instead of an inline object type.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { preferInterfaceTypesRule };
