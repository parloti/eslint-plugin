import { singleLineJsdocRule } from "../../src";

import { createRuleTester } from "../support/rule-tester";

const ruleTester = createRuleTester();

ruleTester.run("single-line-jsdoc", singleLineJsdocRule, {
  invalid: [
    {
      code: ["/**", " * doc", " */", "const value = 1;"].join("\n"),
      errors: [{ messageId: "singleLine" }],
      output: ["/** doc */", "const value = 1;"].join("\n"),
    },
  ],
  valid: [
    {
      code: ["/** doc */", "const value = 1;"].join("\n"),
    },
    {
      code: [
        "/**",
        " * @param value Input value.",
        " */",
        "function demo(value: string): string {",
        "  return value;",
        "}",
      ].join("\n"),
    },
  ],
});
