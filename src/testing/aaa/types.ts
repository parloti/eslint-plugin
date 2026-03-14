import type { Rule } from "eslint";
import type * as ESTree from "estree";

type AaaPhase = "Arrange" | "Act" | "Assert";

type SourceComment = ReturnType<
  Rule.RuleContext["sourceCode"]["getAllComments"]
>[number];

type LocatedComment = SourceComment & {
  loc: NonNullable<SourceComment["loc"]>;
  range: [number, number];
};

type LocatedNode<TNode extends ESTree.Node = ESTree.Node> = TNode & {
  loc: NonNullable<ESTree.Node["loc"]>;
  range: [number, number];
};

interface SectionComment {
  comment: LocatedComment;
  phases: AaaPhase[];
}

interface StatementPhase {
  node: LocatedNode<ESTree.Statement>;
  phase: AaaPhase | undefined;
}

interface TestBlockAnalysis {
  body: LocatedNode<ESTree.BlockStatement>;
  bodyLineCount: number;
  callExpression: LocatedNode<ESTree.CallExpression>;
  newline: "\n" | "\r\n";
  sectionComments: SectionComment[];
  sourceText: string;
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
