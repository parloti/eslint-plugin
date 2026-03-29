import type * as ESTree from "estree";

/** Function signature for pattern identifier collectors. */
type PatternIdentifierCollector = (
  pattern: ESTree.Pattern,
  identifiers: Set<string>,
) => void;

/**
 * Collects identifiers from an array pattern.
 * @param pattern Array pattern to inspect.
 * @param identifiers Identifier set updated in place.
 * @example
 * ```typescript
 * collectArrayPatternIdentifiers({ elements: [], type: "ArrayPattern" }, new Set<string>());
 * ```
 */
function collectArrayPatternIdentifiers(
  pattern: ESTree.Pattern,
  identifiers: Set<string>,
): void {
  const elements = (pattern as ESTree.ArrayPattern).elements as (
    | ESTree.Pattern
    | null
    | undefined
  )[];

  for (const element of elements) {
    if (element !== null && element !== void 0) {
      collectPatternIdentifiers(element, identifiers);
    }
  }
}

/**
 * Collects identifiers from an assignment pattern.
 * @param pattern Assignment pattern to inspect.
 * @param identifiers Identifier set updated in place.
 * @example
 * ```typescript
 * collectAssignmentPatternIdentifiers({ left: { name: "value", type: "Identifier" }, right: { name: "fallback", type: "Identifier" }, type: "AssignmentPattern" } as ESTree.AssignmentPattern, new Set<string>());
 * ```
 */
function collectAssignmentPatternIdentifiers(
  pattern: ESTree.Pattern,
  identifiers: Set<string>,
): void {
  collectPatternIdentifiers(
    (pattern as ESTree.AssignmentPattern).left,
    identifiers,
  );
}

/**
 * Collects identifiers from a plain identifier pattern.
 * @param pattern Identifier pattern to inspect.
 * @param identifiers Identifier set updated in place.
 * @example
 * ```typescript
 * collectIdentifierPatternIdentifiers({ name: "value", type: "Identifier" }, new Set<string>());
 * ```
 */
function collectIdentifierPatternIdentifiers(
  pattern: ESTree.Pattern,
  identifiers: Set<string>,
): void {
  identifiers.add((pattern as ESTree.Identifier).name);
}

/**
 * Collects identifiers from an object pattern.
 * @param pattern Object pattern to inspect.
 * @param identifiers Identifier set updated in place.
 * @example
 * ```typescript
 * collectObjectPatternIdentifiers({ properties: [], type: "ObjectPattern" }, new Set<string>());
 * ```
 */
function collectObjectPatternIdentifiers(
  pattern: ESTree.Pattern,
  identifiers: Set<string>,
): void {
  for (const property of (pattern as ESTree.ObjectPattern).properties) {
    if (property.type === "Property") {
      collectPatternIdentifiers(property.value, identifiers);
    } else {
      collectPatternIdentifiers(property.argument, identifiers);
    }
  }
}

/**
 * Collects all identifier names declared by a destructuring or identifier pattern.
 * @param pattern Pattern node to inspect.
 * @param identifiers Identifier set updated in place.
 * @example
 * ```typescript
 * collectPatternIdentifiers({ name: "value", type: "Identifier" }, new Set<string>());
 * ```
 */
function collectPatternIdentifiers(
  pattern: ESTree.Pattern,
  identifiers: Set<string>,
): void {
  getPatternIdentifierCollector(pattern)(pattern, identifiers);
}

/**
 * Collects identifiers from a rest element pattern.
 * @param pattern Rest element to inspect.
 * @param identifiers Identifier set updated in place.
 * @example
 * ```typescript
 * collectRestPatternIdentifiers({ argument: { name: "value", type: "Identifier" }, type: "RestElement" }, new Set<string>());
 * ```
 */
function collectRestPatternIdentifiers(
  pattern: ESTree.Pattern,
  identifiers: Set<string>,
): void {
  collectPatternIdentifiers(
    (pattern as ESTree.RestElement).argument,
    identifiers,
  );
}

/**
 * Ignores pattern kinds that do not declare identifiers.
 * @param pattern Pattern to ignore.
 * @param identifiers Identifier set left unchanged.
 * @example
 * ```typescript
 * collectUnsupportedPatternIdentifiers({ object: { name: "value", type: "Identifier" }, property: { name: "member", type: "Identifier" }, computed: false, optional: false, type: "MemberExpression" }, new Set<string>());
 * ```
 */
function collectUnsupportedPatternIdentifiers(
  pattern: ESTree.Pattern,
  identifiers: Set<string>,
): void {
  void pattern;
  void identifiers;
}

/**
 * Gets the identifier collector for one supported pattern kind.
 * @param pattern Pattern whose collector is needed.
 * @returns Collector for the pattern, when one exists.
 * @example
 * ```typescript
 * const collector = getPatternIdentifierCollector({ name: "value", type: "Identifier" });
 * void collector;
 * ```
 */
function getPatternIdentifierCollector(
  pattern: ESTree.Pattern,
): PatternIdentifierCollector {
  switch (pattern.type) {
    case "ArrayPattern": {
      return collectArrayPatternIdentifiers;
    }
    case "AssignmentPattern": {
      return collectAssignmentPatternIdentifiers;
    }
    case "Identifier": {
      return collectIdentifierPatternIdentifiers;
    }
    case "MemberExpression": {
      return collectUnsupportedPatternIdentifiers;
    }
    case "ObjectPattern": {
      return collectObjectPatternIdentifiers;
    }
    case "RestElement": {
      return collectRestPatternIdentifiers;
    }
    default: {
      return collectUnsupportedPatternIdentifiers;
    }
  }
}

export { collectPatternIdentifiers };
