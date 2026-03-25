import { preferInterfaceTypesRule } from "../../src";

import { createRuleTester } from "../support/rule-tester";

const ruleTester = createRuleTester();

ruleTester.run("prefer-interface-types", preferInterfaceTypesRule, {
  invalid: [
    {
      code: [
        "function demo(input: { value: string }): { value: string } {",
        "  return input;",
        "}",
      ].join("\n"),
      errors: [
        { messageId: "preferNamedObject" },
        { messageId: "preferNamedObject" },
      ],
    },
  ],
  valid: [
    {
      code: [
        "interface DemoInput {",
        "  value: string;",
        "}",
        "",
        "function demo(input: DemoInput): DemoInput {",
        "  return input;",
        "}",
      ].join("\n"),
    },
    {
      code: [
        "type DemoInput = { value: string };",
        "",
        "const demo = (...values: DemoInput[]): DemoInput => values[0]!;",
      ].join("\n"),
    },
  ],
});
