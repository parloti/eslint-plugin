import type { Rule } from "eslint";

/** Type definition for rule data. */
type Comment = ReturnType<
  Rule.RuleContext["sourceCode"]["getAllComments"]
>[number];

/** Type definition for rule data. */
interface CommentLine {
  /** End field value. */
  end: number;

  /** LineBreakLength field value. */
  lineBreakLength: number;

  /** Start field value. */
  start: number;

  /** Text field value. */
  text: string;
}

/** Type definition for rule data. */
interface ParameterMemberTag {
  /** Basename field value. */
  basename: string;

  /** FullName field value. */
  fullName: string;

  /** Line field value. */
  line: CommentLine;
}

/** Type definition for rule data. */
interface TypeAnnotationNode {
  /** Type field value. */
  type: string;
}

export type { Comment, CommentLine, ParameterMemberTag, TypeAnnotationNode };
