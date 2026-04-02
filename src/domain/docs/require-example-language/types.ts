import type { Rule } from "eslint";

/** Type definition for rule data. */
type Comment = ReturnType<
  Rule.RuleContext["sourceCode"]["getAllComments"]
>[number];

/** Type definition for rule data. */
interface Example {
  /** Content field value. */
  content: string;

  /** EndIndex field value. */
  endIndex: number;

  /** EndOffset field value. */
  endOffset: number;

  /** LineIndex field value. */
  lineIndex: number;

  /** Prefix field value. */
  prefix: string;

  /** StartOffset field value. */
  startOffset: number;
}

/** Type definition for rule data. */
type Problem = "emptyExample" | "missingFence" | "missingLanguage";

export type { Comment, Example, Problem };
