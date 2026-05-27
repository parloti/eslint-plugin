import type { Rule } from "eslint";

/** Type definition for rule data. */
interface FunctionLikeNode {
  /** Params helper value. */
  params?: unknown[];

  /** ReturnType helper value. */
  returnType?: {
    /** TypeAnnotation helper value. */
    typeAnnotation?: TypeAnnotationNode;
  };
}

/** Type definition for rule data. */
interface ParameterContainer {
  /** Argument helper value. */
  argument?: unknown;

  /** Left-side helper value used by assignment patterns. */
  left?: unknown;

  /** Parameter helper value. */
  parameter?: unknown;
}

/** Type definition for rule data. */
interface TypeAnnotationContainer {
  /** TypeAnnotation helper value. */
  typeAnnotation?: {
    /** TypeAnnotation helper value. */
    typeAnnotation?: TypeAnnotationNode;
  };
}

/** Type definition for rule data. */
interface TypeAnnotationNode {
  /** Type field value. */
  type: string;

  /** Nested annotation for parenthesized types. */
  typeAnnotation?: unknown;

  /** Nested member annotations for union/intersection types. */
  types?: unknown[];
}

/** Type definition for variable declarator nodes with optional identifiers. */
interface VariableDeclaratorNode {
  /** Identifier or binding pattern for the variable declarator. */
  id?: unknown;
}

/**
 * Gets a nested type annotation from parameter wrappers.
 * @param node Parameter wrapper node.
 * @returns The nested type annotation when present.
 * @example
 * ```typescript
 * const annotation = getNestedTypeAnnotation({ argument: node });
 * ```
 */
const getNestedTypeAnnotation = (
  node: ParameterContainer,
): TypeAnnotationNode | undefined => {
  if (node.argument !== void 0) {
    return getTypeAnnotationNode(node.argument);
  }

  if (node.left !== void 0) {
    return getTypeAnnotationNode(node.left);
  }

  if (node.parameter !== void 0) {
    return getTypeAnnotationNode(node.parameter);
  }

  return void 0;
};

/**
 * Extracts the type annotation from a node.
 * @param node Node that may contain a type annotation.
 * @returns The type annotation when present.
 * @example
 * ```typescript
 * const annotation = getTypeAnnotationNode(node);
 * ```
 */
const getTypeAnnotationNode = (
  node: unknown,
): TypeAnnotationNode | undefined => {
  if (node === null || typeof node !== "object") {
    return void 0;
  }

  const directTypeAnnotation = (node as TypeAnnotationContainer).typeAnnotation
    ?.typeAnnotation;

  if (directTypeAnnotation !== void 0) {
    return directTypeAnnotation;
  }

  return getNestedTypeAnnotation(node);
};

/**
 * Gets the return type annotation for a function-like node.
 * @param node Node that may contain a return type.
 * @returns The return type annotation when present.
 * @example
 * ```typescript
 * const annotation = getReturnTypeAnnotation(node);
 * ```
 */
const getReturnTypeAnnotation = (
  node: unknown,
): TypeAnnotationNode | undefined => {
  if (node === null || typeof node !== "object") {
    return void 0;
  }

  const typedNode = node as FunctionLikeNode;

  return typedNode.returnType?.typeAnnotation;
};

/**
 * Gets getParameters.
 * @param node Input node value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getParameters();
 * ```
 */
const getParameters = (node: unknown): unknown[] => {
  if (node === null || typeof node !== "object") {
    return [];
  }

  const typedNode = node as FunctionLikeNode;

  return Array.isArray(typedNode.params) ? typedNode.params : [];
};

/**
 * Finds an inline object type literal within a type annotation node.
 * @param node Type annotation node to inspect.
 * @returns The first inline object type literal when present.
 * @example
 * ```typescript
 * const inlineObjectType = getInlineObjectTypeLiteral(annotation);
 * ```
 */
const getInlineObjectTypeLiteral = (
  node: TypeAnnotationNode | undefined,
): TypeAnnotationNode | undefined => {
  if (node === void 0) {
    return void 0;
  }

  if (node.type === "TSTypeLiteral") {
    return node;
  }

  if (node.type === "TSParenthesizedType") {
    return getInlineObjectTypeLiteral(
      node.typeAnnotation as TypeAnnotationNode | undefined,
    );
  }

  if (node.type === "TSUnionType" || node.type === "TSIntersectionType") {
    const nestedTypes = Array.isArray(node.types) ? node.types : [];

    for (const nestedType of nestedTypes) {
      const nestedInlineObjectType = getInlineObjectTypeLiteral(
        nestedType as TypeAnnotationNode | undefined,
      );

      if (nestedInlineObjectType !== void 0) {
        return nestedInlineObjectType;
      }
    }
  }

  return void 0;
};

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
