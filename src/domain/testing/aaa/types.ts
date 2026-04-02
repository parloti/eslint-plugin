import type { Rule } from "eslint";
import type * as ESTree from "estree";

/** Named AAA phases recognized by the analyzer. */
type AaaPhase = "Act" | "Arrange" | "Assert";

/** Source comment with guaranteed location and range metadata. */
type LocatedComment = SourceComment & {
  /** Normalized location for the comment. */
  loc: NonNullable<SourceComment["loc"]>;

  /** Inclusive source range for the comment. */
  range: [number, number];
};

/**
 * ESTree node with required location and range metadata.
 * @template TNode Node subtype carried by the wrapper.
 */
type LocatedNode<TNode extends ESTree.Node = ESTree.Node> = TNode & {
  /** Normalized location for the node. */
  loc: NonNullable<ESTree.Node["loc"]>;

  /** Inclusive source range for the node. */
  range: [number, number];
};

/** Section comment and the AAA phases it declares. */
interface SectionComment {
  /** Located line comment used as the section marker. */
  comment: LocatedComment;

  /** Phases declared by the section marker. */
  phases: AaaPhase[];
}

/** Raw source comment nodes returned by ESLint. */
type SourceComment = ReturnType<
  Rule.RuleContext["sourceCode"]["getAllComments"]
>[number];

/** Statement annotated with its active AAA phases. */
interface StatementPhase {
  /** Statement node that belongs to the analyzed test body. */
  node: LocatedNode<ESTree.Statement>;

  /** Last active phase before this statement, when any exists. */
  phase: AaaPhase | undefined;

  /** All active phases inherited from the nearest section marker. */
  phases: AaaPhase[];
}

/** Derived metadata for a supported test callback. */
interface TestBlockAnalysis {
  /** Block body belonging to the test callback. */
  body: LocatedNode<ESTree.BlockStatement>;

  /** Number of lines inside the callback body. */
  bodyLineCount: number;

  /** Original call expression for `it` or `test`. */
  callExpression: LocatedNode<ESTree.CallExpression>;

  /** Newline style used by the source text. */
  newline: "\n" | "\r\n";

  /** Ordered AAA section comments within the callback body. */
  sectionComments: SectionComment[];

  /** Full source text for the analyzed file. */
  sourceText: string;

  /** Statements paired with their resolved AAA phases. */
  statements: StatementPhase[];
}

export type {
  AaaPhase,
  LocatedComment,
  LocatedNode,
  SectionComment,
  SourceComment,
  StatementPhase,
  TestBlockAnalysis,
};
