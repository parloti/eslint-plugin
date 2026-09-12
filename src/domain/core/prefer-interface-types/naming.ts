import { AST_NODE_TYPES } from "@typescript-eslint/utils";

import type {
  InlineTypeMatch,
  NamedInlineTypeMatch,
  NamingNode,
} from "./types";

import { collectTopLevelNames } from "./declaration-names";

/**
 * Allocates unique PascalCase names for collected inline object types.
 * @param matches Collected inline object types in report order.
 * @param topLevelStatements Program statements used for collision detection.
 * @param reservedNames Names declared in lexical scopes that could capture a generated reference.
 * @returns Matches paired with collision-free names.
 * @example
 * ```typescript
 * const namedMatches = allocateNames(matches, program.body);
 * ```
 */
function allocateNames(
  matches: readonly InlineTypeMatch[],
  topLevelStatements: readonly unknown[],
  reservedNames: ReadonlySet<string> = new Set(),
): NamedInlineTypeMatch[] {
  const usedNames = collectTopLevelNames(topLevelStatements);

  for (const reservedName of reservedNames) {
    usedNames.add(reservedName);
  }

  return matches.map((match) => {
    const fallback = match.baseName === "Parameter" ? "Parameter" : "Type";
    const preferredName = toPascalCase(match.baseName, fallback);
    let name = preferredName;
    let suffix = 1;

    while (usedNames.has(name)) {
      name = `${preferredName}${String(suffix)}`;
      suffix += 1;
    }

    usedNames.add(name);

    return { ...match, name };
  });
}

/**
 * Narrows an unknown value to the small naming node surface.
 * @param value Candidate node value.
 * @returns Naming node when the value is object-like.
 * @example
 * ```typescript
 * const node = asNamingNode(value);
 * ```
 */
function asNamingNode(value: unknown): NamingNode | undefined {
  return value !== null && typeof value === "object" ? value : void 0;
}

/**
 * Returns an identifier name when the supplied value is an identifier node.
 * @param value Candidate identifier node.
 * @returns Identifier name when present.
 * @example
 * ```typescript
 * const name = getIdentifierName(node);
 * ```
 */
function getIdentifierName(value: unknown): string | undefined {
  const node = asNamingNode(value);

  return node?.type === AST_NODE_TYPES.Identifier &&
    typeof node.name === "string"
    ? node.name
    : void 0;
}

/**
 * Gets an identifier name from a parameter, including supported wrappers.
 * @param parameter Parameter node to inspect.
 * @returns Parameter identifier or the required fallback.
 * @example
 * ```typescript
 * const name = getParameterBaseName(parameter);
 * ```
 */
function getParameterBaseName(parameter: unknown): string {
  let node = asNamingNode(parameter);

  while (node !== void 0) {
    if (
      node.type === AST_NODE_TYPES.Identifier &&
      typeof node.name === "string"
    ) {
      return node.name;
    }

    if (node.type === AST_NODE_TYPES.RestElement) {
      node = asNamingNode((node as { argument?: unknown }).argument);
      continue;
    }

    if (node.type === AST_NODE_TYPES.AssignmentPattern) {
      node = asNamingNode((node as { left?: unknown }).left);
      continue;
    }

    if (node.type === AST_NODE_TYPES.TSParameterProperty) {
      node = asNamingNode((node as { parameter?: unknown }).parameter);
      continue;
    }

    break;
  }

  return "Parameter";
}

/**
 * Returns a static identifier or string-literal property name.
 * @param value Candidate property key.
 * @returns Static property name when present.
 * @example
 * ```typescript
 * const name = getPropertyName(node.key);
 * ```
 */
function getPropertyName(value: unknown): string | undefined {
  const node = asNamingNode(value);

  if (
    node?.type === AST_NODE_TYPES.Identifier &&
    typeof node.name === "string"
  ) {
    return node.name;
  }

  if (node?.type === AST_NODE_TYPES.Literal) {
    const literalValue = node.value;

    return typeof literalValue === "string" ? literalValue : void 0;
  }

  return void 0;
}

/**
 * Resolves the nearest declared name for a function-like return type.
 * @param functionNode Function-like node owning the return annotation.
 * @returns Nearby identifier or the anonymous-context fallback.
 * @example
 * ```typescript
 * const name = getReturnBaseName(functionNode);
 * ```
 */
function getReturnBaseName(functionNode: unknown): string {
  const node = asNamingNode(functionNode);

  if (node === void 0) {
    return "Type";
  }

  const ownIdentifier = getIdentifierName(node.id) ?? getPropertyName(node.key);

  if (ownIdentifier !== void 0) {
    return ownIdentifier;
  }

  let current = node.parent;

  while (current !== null && current !== void 0) {
    if (current.type === AST_NODE_TYPES.VariableDeclarator) {
      return getIdentifierName(current.id) ?? "Type";
    }

    const propertyName = getPropertyName(current.key);

    if (propertyName !== void 0) {
      return propertyName;
    }

    current = current.parent;
  }

  return "Type";
}

/**
 * Gets the declared identifier for a variable annotation.
 * @param variableNode Variable declarator node.
 * @returns Variable identifier or the anonymous-context fallback.
 * @example
 * ```typescript
 * const name = getVariableBaseName(variableNode);
 * ```
 */
function getVariableBaseName(variableNode: unknown): string {
  return getIdentifierName(asNamingNode(variableNode)?.id) ?? "Type";
}

/**
 * Converts an identifier-like value to a small PascalCase name.
 * @param value Identifier-like source value.
 * @param fallback Name used when the value has no ASCII word characters.
 * @returns PascalCase name suitable for a generated interface.
 * @example
 * ```typescript
 * const name = toPascalCase("input_value", "Type");
 * ```
 */
function toPascalCase(value: string, fallback: string): string {
  const words = value
    .replaceAll(/([a-z\d])([A-Z])/g, "$1 $2")
    .replaceAll(/[^A-Za-z\d]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  const name = words
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join("");

  return name.length > 0 && !/^\d/.test(name) ? name : fallback;
}

export {
  allocateNames,
  getParameterBaseName,
  getReturnBaseName,
  getVariableBaseName,
};
