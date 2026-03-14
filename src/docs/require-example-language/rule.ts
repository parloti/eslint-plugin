import type { Rule } from "eslint";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import { getExamples } from "./examples";
import { reportExample } from "./reporting";

/**
 * ESLint rule requiring \@example tags to use fenced code blocks with a language.
 */
const requireExampleLanguageRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    const { sourceCode } = context;

    for (const comment of sourceCode.getAllComments()) {
      if (comment.type === "Block" && comment.value.startsWith("*")) {
        const examples = getExamples(comment.value);

        const hasOtherExamples = examples.length > 1;

        for (const example of examples) {
          reportExample({ comment, context, example, hasOtherExamples });
        }
      }
    }

    return {};
  },
  meta: {
    docs: createRuleDocumentation(
      "require-example-language",
      "Require @example tags to use fenced code blocks with a language.",
    ),
    fixable: "code",
    messages: {
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
