import type { Rule } from "eslint";

import type { TypeAnnotationNode } from "./rule-utilities";

/** Source-code surface required to build the aggregate autofix. */
type FixSourceCode = Pick<
  Rule.RuleContext["sourceCode"],
  "ast" | "getText" | "text"
> & {
  /** Scope information used to preserve lexical type bindings. */
  scopeManager?: ScopeManager;
};

/** One inline object type collected for deferred reporting and fixing. */
interface InlineTypeMatch {
  /** Preferred base name before PascalCase conversion and collision handling. */
  baseName: string;

  /** Inline object type reported by the rule. */
  node: TypeAnnotationNode;
}

/** One collected inline object type with its allocated interface name. */
interface NamedInlineTypeMatch extends InlineTypeMatch {
  /** Collision-free generated interface name. */
  name: string;
}

/** Node shape used to resolve nearby declaration names. */
interface NamingNode {
  /** Optional declaration identifier. */
  id?: unknown;

  /** Optional property or method key. */
  key?: unknown;

  /** Optional identifier name. */
  name?: unknown;

  /** Parent node supplied by the parser. */
  parent?: NamingNode | null;

  /** Node type discriminator. */
  type?: unknown;

  /** Optional literal value. */
  value?: unknown;
}

/** Named match whose source range has been validated for replacement. */
interface RangedNamedInlineTypeMatch extends NamedInlineTypeMatch {
  /** Inline object type with a required source range. */
  node: TypeAnnotationNode & { range: [number, number] };
}

/** Minimal lexical scope surface required by autofix safety checks. */
interface Scope {
  /** AST node that owns the scope. */
  block?: { range?: [number, number] };

  /** References originating from the scope. */
  references?: ScopeReference[];

  /** Scope category reported by the TypeScript ESLint parser. */
  type?: string;

  /** Declarations visible through the scope. */
  variables?: ScopeVariable[];
}

/** Minimal identifier surface exposed by scope references. */
interface ScopeIdentifier {
  /** Source range for the referenced identifier. */
  range?: [number, number];
}

/** Scope manager surface exposed by the TypeScript ESLint parser. */
interface ScopeManager {
  /** Lexical scopes discovered in the source file. */
  scopes: Scope[];
}

/** One identifier reference and its resolved declaration scope. */
interface ScopeReference {
  /** Referenced identifier node. */
  identifier?: ScopeIdentifier;

  /** Resolved declaration when the reference is locally bound. */
  resolved?: null | { scope?: Scope };
}

/** One declaration recorded by the scope manager. */
interface ScopeVariable {
  /** Declared identifier name. */
  name?: string;
}

export type {
  FixSourceCode,
  InlineTypeMatch,
  NamedInlineTypeMatch,
  NamingNode,
  RangedNamedInlineTypeMatch,
  Scope,
  ScopeManager,
};
