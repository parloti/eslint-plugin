/** Provides the minimal node shape used by the rule. */
interface BaseNode {
  /** Parent node used to inspect surrounding syntax. */
  parent?: BaseNode;
  /** Source range used by autofix logic. */
  range?: Range;
  /** ESTree node type. */
  type: string;
}

/** Represents a declaration that can be rewritten by the fixer. */
interface FixableVariableDeclarationNode extends VariableDeclarationNode {
  /** Confirmed declaration keyword. */
  kind: string;
  /** Confirmed source range for the full declaration. */
  range: Range;
}

/** Represents a `for...in` or `for...of` statement. */
interface ForInOrOfStatementNode extends BaseNode {
  /** Left-hand initializer of the loop. */
  left?: BaseNode;
}

/** Represents a classic `for` statement. */
interface ForStatementNode extends BaseNode {
  /** Initializer section of the loop. */
  init?: BaseNode | null;
}

/** Represents a source range within the original file. */
type Range = [number, number];

/** Represents a node whose range has been confirmed. */
interface RangedNode extends BaseNode {
  /** Confirmed source range for the node. */
  range: Range;
}

/** Represents a declarator whose range has been confirmed. */
interface RangedVariableDeclaratorNode extends VariableDeclaratorNode {
  /** Confirmed source range for the declarator. */
  range: Range;
}

/** Exposes the source access methods used by the rule. */
interface SourceCodeAccess {
  /** Returns the source text for a node or the full file when omitted. */
  getText: (node?: BaseNode) => string;
  /** Raw source text when available from ESLint. */
  text?: string;
}

/** Represents a variable declaration statement. */
interface VariableDeclarationNode extends BaseNode {
  /** Individual declarators contained in the declaration. */
  declarations?: VariableDeclaratorNode[];
  /** Declaration kind such as `const`, `let`, or `var`. */
  kind?: string;
}

/** Represents a single variable declarator. */
type VariableDeclaratorNode = BaseNode;

/**
 * Determines whether a declaration contains the data needed for autofix.
 * @param node Declaration to validate.
 * @returns Whether the declaration exposes both `kind` and `range`.
 * @example
 * ```typescript
 * const fixable = hasFixData({ kind: "const", range: [0, 5], type: "VariableDeclaration" });
 * ```
 */
function hasFixData(
  node: VariableDeclarationNode,
): node is FixableVariableDeclarationNode {
  return hasRange(node) && "kind" in node && typeof node.kind === "string";
}

/**
 * Determines whether a node has a complete range.
 * @param node Node to validate.
 * @returns Whether the node exposes a valid two-item range.
 * @example
 * ```typescript
 * const ranged = hasRange({ range: [0, 1], type: "Identifier" });
 * ```
 */
function hasRange(node: BaseNode | undefined): node is RangedNode {
  return isRange(node?.range);
}

/**
 * Checks whether a value is a complete source range.
 * @param value Candidate range value.
 * @returns Whether the value is a valid source range tuple.
 * @example
 * ```typescript
 * const validRange = isRange([0, 1]);
 * ```
 */
function isRange(value: BaseNode["range"]): value is Range {
  return Array.isArray(value);
}

export { hasFixData, hasRange };
export type {
  FixableVariableDeclarationNode,
  ForInOrOfStatementNode,
  ForStatementNode,
  Range,
  RangedVariableDeclaratorNode,
  SourceCodeAccess,
  VariableDeclarationNode,
  VariableDeclaratorNode,
};
