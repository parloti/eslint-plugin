import type { Rule } from "eslint";

import { createRuleDocumentation } from "../../custom-rule-documentation";
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

  return getNestedTypeAnnotation(node as ParameterContainer);
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
 * Checks whether the node represents a type literal.
 * @param node Type annotation node to check.
 * @returns True when the node is a type literal.
 * @example
 * ```typescript
 * const isLiteral = isTypeLiteral(annotation);
 * ```
 */
const isTypeLiteral = (
  node: TypeAnnotationNode | undefined,
): node is TypeAnnotationNode => node?.type === "TSTypeLiteral";

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
    const typeAnnotation = getTypeAnnotationNode(parameter);

    if (isTypeLiteral(typeAnnotation)) {
      reportTypeLiteral(context, typeAnnotation);
    }
  }

  const returnTypeAnnotation = getReturnTypeAnnotation(node);

  if (isTypeLiteral(returnTypeAnnotation)) {
    reportTypeLiteral(context, returnTypeAnnotation);
  }
};

/** ESLint rule requiring named interface/type aliases for object types. */
const preferInterfaceTypesRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    const listener = (node: Rule.Node): void => {
      checkFunctionLike(context, node);
    };

    return {
      ArrowFunctionExpression: listener,
      FunctionDeclaration: listener,
      FunctionExpression: listener,
      TSCallSignatureDeclaration: listener,
      TSConstructSignatureDeclaration: listener,
      TSDeclareFunction: listener,
      TSFunctionType: listener,
      TSMethodSignature: listener,
    };
  },
  meta: {
    docs: createRuleDocumentation(
      "prefer-interface-types",
      "Require named interfaces or type aliases for object types in parameters and return types.",
    ),
    messages: {
      preferNamedObject:
        "Use a named interface or type alias instead of an inline object type.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { preferInterfaceTypesRule };
