import type { Rule } from "eslint";

import type { TypeAnnotationNode } from "./types";

/** Type definition for rule data. */
interface FunctionLikeNode {
  /** Params helper value. */
  params?: unknown[];
}

/** Type definition for rule data. */
interface IdentifierNode {
  /** Name helper value. */
  name?: string;

  /** Type helper value. */
  type?: string;

  /** TypeAnnotation helper value. */
  typeAnnotation?: {
    /** TypeAnnotation helper value. */
    typeAnnotation?: TypeAnnotationNode;
  };
}

/** Type definition for rule data. */
interface NamedIdentifierNode extends IdentifierNode {
  /** Name field value. */
  name: string;
}

/** Type definition for rule data. */
interface ParameterContainer {
  /** Argument helper value. */
  argument?: unknown;

  /** Left helper value. */
  left?: unknown;

  /** Parameter helper value. */
  parameter?: unknown;

  /** Type helper value. */
  type?: string;
}

/** Type definition for rule data. */
interface ParameterInfo {
  /** Name field value. */
  name: string;

  /** TypeAnnotation helper value. */
  typeAnnotation?: TypeAnnotationNode;
}

/**
 * Gets a type annotation node from an identifier.
 * @param node Identifier node to inspect.
 * @returns The type annotation node when present.
 * @example
 * ```typescript
 * const annotation = getTypeAnnotationNode(identifier);
 * ```
 */
const getTypeAnnotationNode = (
  node: IdentifierNode,
): TypeAnnotationNode | undefined => node.typeAnnotation?.typeAnnotation;

/**
 * Defines resolveParameterNode.
 * @param node Input node value.
 * @returns Return value output.
 * @example
 * ```typescript
 * resolveParameterNode();
 * ```
 */
const resolveParameterNode = (node: unknown): unknown => {
  if (node === null || typeof node !== "object") {
    return node;
  }

  const container = node as ParameterContainer;

  if (container.argument !== void 0) {
    return container.argument;
  }

  if (container.parameter !== void 0) {
    return container.parameter;
  }

  if (container.type === "AssignmentPattern" && container.left !== void 0) {
    return container.left;
  }

  return node;
};

/**
 * Gets the parameter identifier for a parameter node.
 * @param node Parameter node to inspect.
 * @returns The identifier node when present.
 * @example
 * ```typescript
 * const identifier = getParameterIdentifier(node);
 * ```
 */
const getParameterIdentifier = (
  node: unknown,
): NamedIdentifierNode | undefined => {
  const resolved = resolveParameterNode(node);

  if (resolved === null || typeof resolved !== "object") {
    return void 0;
  }

  const identifier = resolved as IdentifierNode;
  const { name } = identifier;

  if (identifier.type !== "Identifier" || typeof name !== "string") {
    return void 0;
  }

  return { ...identifier, name } as NamedIdentifierNode;
};

/**
 * Gets parameter info for the given node.
 * @param node Parameter node to inspect.
 * @returns Parameter info when available.
 * @example
 * ```typescript
 * const info = getParameterInfo(node);
 * ```
 */
const getParameterInfo = (node: unknown): ParameterInfo | undefined => {
  const identifier = getParameterIdentifier(node);

  if (identifier === void 0) {
    return void 0;
  }

  const typeAnnotation = getTypeAnnotationNode(identifier);

  return typeAnnotation === void 0
    ? { name: identifier.name }
    : {
        name: identifier.name,
        typeAnnotation,
      };
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
 * Builds a lookup of parameter names to type annotations.
 * @param node Function-like node.
 * @returns Lookup of parameter names to annotations.
 * @example
 * ```typescript
 * const lookup = getParameterTypeLookup(node);
 * ```
 */
const getParameterTypeLookup = (
  node: Rule.Node,
): Map<string, TypeAnnotationNode> => {
  const lookup = new Map<string, TypeAnnotationNode>();

  for (const parameter of getParameters(node)) {
    const info = getParameterInfo(parameter);

    if (info !== void 0 && info.typeAnnotation !== void 0) {
      lookup.set(info.name, info.typeAnnotation);
    }
  }

  return lookup;
};

/**
 * Checks whether a type annotation is a named type reference.
 * @param typeAnnotation Type annotation to inspect.
 * @returns True when the annotation is a named reference.
 * @example
 * ```typescript
 * const ok = isNamedTypeReference(annotation);
 * ```
 */
const isNamedTypeReference = (
  typeAnnotation: TypeAnnotationNode | undefined,
): boolean => typeAnnotation?.type === "TSTypeReference";

export { getParameterTypeLookup, isNamedTypeReference };
