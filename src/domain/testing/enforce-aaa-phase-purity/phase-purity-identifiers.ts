import type * as ESTree from "estree";

import type { TestBlockAnalysis } from "../aaa";

import { collectPatternIdentifiers } from "./pattern-identifiers";

/** Type definition for rule data. */
interface NodeCandidate {
  /** Optional ESTree node type marker. */
  type?: unknown;
}

/**
 * Collects referenced identifiers from one Assert-phase statement.
 * @param statement Statement to inspect.
 * @param identifiers Identifier set updated in place.
 * @example
 * ```typescript
 * collectAssertStatementIdentifiers({ type: "ExpressionStatement" } as never, new Set<string>());
 * ```
 */
function collectAssertStatementIdentifiers(
  statement: TestBlockAnalysis["statements"][number],
  identifiers: Set<string>,
): void {
  if (!statement.phases.includes("Assert")) {
    return;
  }

  if (statement.node.type !== "VariableDeclaration") {
    collectReferencedIdentifiers(statement.node, identifiers);
    return;
  }

  for (const declaration of statement.node.declarations) {
    if (declaration.init !== null && declaration.init !== void 0) {
      collectReferencedIdentifiers(declaration.init, identifiers);
    }
  }
}

/**
 * Collects referenced identifier names from an ESTree node.
 * @param node Node to inspect.
 * @param identifiers Identifier set updated in place.
 * @example
 * ```typescript
 * collectReferencedIdentifiers({ name: "value", type: "Identifier" }, new Set<string>());
 * ```
 */
function collectReferencedIdentifiers(
  node: ESTree.Node,
  identifiers: Set<string>,
): void {
  if (node.type === "Identifier") {
    identifiers.add(node.name);
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    collectReferencedValue(key, value, identifiers);
  }
}

/**
 * Collects referenced identifiers from one object entry on an ESTree node.
 * @param key Entry key being inspected.
 * @param value Entry value being inspected.
 * @param identifiers Identifier set updated in place.
 * @example
 * ```typescript
 * collectReferencedValue("type", "Identifier", new Set<string>());
 * ```
 */
function collectReferencedValue(
  key: string,
  value: unknown,
  identifiers: Set<string>,
): void {
  if (key === "parent") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (isNode(item)) {
        collectReferencedIdentifiers(item, identifiers);
      }
    }
    return;
  }

  if (isNode(value)) {
    collectReferencedIdentifiers(value, identifiers);
  }
}

/**
 * Gets identifiers declared by an Act-phase variable declaration.
 * @param statement Statement to inspect.
 * @returns Declared identifier names.
 * @example
 * ```typescript
 * getActDeclaredIdentifiers({ declarations: [], kind: "const", type: "VariableDeclaration" } as never);
 * ```
 */
function getActDeclaredIdentifiers(statement: ESTree.Statement): Set<string> {
  const identifiers = new Set<string>();

  if (statement.type !== "VariableDeclaration") {
    return identifiers;
  }

  for (const declaration of statement.declarations) {
    collectPatternIdentifiers(declaration.id, identifiers);
  }

  return identifiers;
}

/**
 * Collects all identifiers referenced from the Assert phase.
 * @param analysis Parsed test-block analysis.
 * @returns Referenced identifier names from Assert statements.
 * @example
 * ```typescript
 * getAssertReferencedIdentifiers({ statements: [] } as never);
 * ```
 */
function getAssertReferencedIdentifiers(
  analysis: TestBlockAnalysis,
): Set<string> {
  const identifiers = new Set<string>();

  for (const statement of analysis.statements) {
    collectAssertStatementIdentifiers(statement, identifiers);
  }

  return identifiers;
}

/**
 * Checks whether an Act-phase declaration is later referenced from Assert.
 * @param assertReferencedIdentifiers Referenced identifiers collected from Assert.
 * @param statement Statement to inspect.
 * @returns True when one declared identifier is asserted later.
 * @example
 * ```typescript
 * isActResultAsserted(new Set<string>(), { type: "ExpressionStatement" } as never);
 * ```
 */
function isActResultAsserted(
  assertReferencedIdentifiers: Set<string>,
  statement: ESTree.Statement,
): boolean {
  for (const identifier of getActDeclaredIdentifiers(statement)) {
    if (assertReferencedIdentifiers.has(identifier)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether an unknown value is an ESTree node.
 * @param value Unknown value to inspect.
 * @returns True when the value has the shape of an ESTree node.
 * @example
 * ```typescript
 * isNode({ type: "Identifier" });
 * ```
 */
function isNode(value: unknown): value is ESTree.Node {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as NodeCandidate).type === "string"
  );
}

export { getAssertReferencedIdentifiers, isActResultAsserted };
