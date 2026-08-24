import type { Rule } from "eslint";

import { getExamples } from "./examples-collect";
import { reportExample } from "./reporting";

/**
 * ESLint rule requiring \@example tags to use fenced code blocks with a language.
 */
const requireExampleLanguageRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    const { sourceCode } = context;

    for (const comment of sourceCode.getAllComments()) {
      if (!(comment.type === "Block" && comment.value.startsWith("*"))) {
        continue;
      }

      const examples = getExamples(comment.value);

      const hasOtherExamples = examples.length > 1;

      for (const example of examples) {
        reportExample({ comment, context, example, hasOtherExamples });
      }
    }

    return {};
  },
  meta: {
    docs: {
      description:
        "Require @example tags to use fenced code blocks with a language.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/require-example-language.md",
    },
    fixable: "code",
    messages: {
      contentOutsideFence:
        "@example content must be fully inside fenced code blocks.",
      emptyExample: "@example must include example content.",
      missingFence:
        "@example must include a fenced code block with a language (e.g. ```typescript).",
      missingLanguage:
        "@example fenced code blocks must specify a language (e.g. ```typescript).",
    },
    schema: [],
    type: "problem",
  },
};

export { requireExampleLanguageRule };
