import type { Rule } from "eslint";

import { cwd } from "node:process";

import { buildListenerForFilename } from "./require-test-companion-listeners";
import { getOptions } from "./require-test-companion-options";

/** ESLint rule enforcing 1:1 test companions for TypeScript files. */
const requireTestCompanionRule: Rule.RuleModule = {
  create: (context: Rule.RuleContext): Rule.RuleListener =>
    buildListenerForFilename(
      context,
      context.filename,
      getOptions(context.options),
      typeof context.cwd === "string" ? context.cwd : cwd(),
    ),
  meta: {
    defaultOptions: [
      {
        enforceIn: ["src/**"],
        ignorePatterns: ["/*.d.ts", "/index.ts"],
        testSuffixes: ["spec", "test"],
      },
    ],
    docs: {
      description:
        "Require each test file to have a matching TypeScript source file.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/require-test-companion.md",
    },
    messages: {
      missingSource:
        "Test file requires a matching source file '{{sourceFile}}' in the same folder. If this test file is orphaned, move its tests to the correct companion file or delete this orphan file.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          enforceIn: {
            description:
              "Glob patterns that define where test files must have matching source companions.",
            oneOf: [
              { description: "A single glob pattern.", type: "string" },
              {
                description: "A list of glob patterns.",
                items: { type: "string" },
                minItems: 1,
                type: "array",
              },
            ],
          },
          ignorePatterns: {
            description:
              "Glob patterns that should be excluded from test-to-source companion checks.",
            oneOf: [
              { description: "A single ignore glob pattern.", type: "string" },
              {
                description: "A list of ignore glob patterns.",
                items: { type: "string" },
                minItems: 1,
                type: "array",
              },
            ],
          },
          testSuffixes: {
            description:
              "Filename suffixes that are recognized as valid test companions.",
            oneOf: [
              { description: "A single test filename suffix.", type: "string" },
              {
                description: "A list of test filename suffixes.",
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
