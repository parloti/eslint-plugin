import type { Rule } from "eslint";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import { buildListenerForFilename } from "./require-test-companion-listeners";
import { getOptions } from "./require-test-companion-options";

/** ESLint rule enforcing 1:1 test companions for TypeScript files. */
const requireTestCompanionRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return buildListenerForFilename(
      context,
      context.filename,
      getOptions(context.options),
    );
  },
  meta: {
    docs: createRuleDocumentation(
      "require-test-companion",
      "Require a matching test file for each TypeScript file and vice versa.",
    ),
    messages: {
      missingSource:
        "Test file requires a matching source file '{{sourceFile}}' in the same folder.",
      missingTest:
        "Source file requires a matching test file ({{testFiles}}) in the same folder.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          enforceIn: {
            oneOf: [
              { type: "string" },
              {
                items: { type: "string" },
                minItems: 1,
                type: "array",
              },
            ],
          },
          ignorePatterns: {
            oneOf: [
              { type: "string" },
              {
                items: { type: "string" },
                minItems: 1,
                type: "array",
              },
            ],
          },
          testSuffixes: {
            oneOf: [
              { type: "string" },
              {
                items: { type: "string" },
                minItems: 1,
                type: "array",
              },
            ],
          },
        },
        type: "object",
      },
    ],
    type: "problem",
  },
};

export { requireTestCompanionRule };
