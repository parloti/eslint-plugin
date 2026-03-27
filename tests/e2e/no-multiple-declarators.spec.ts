import { noMultipleDeclaratorsRule } from "../../src";
import { createRuleTester } from "../support/rule-tester";

/**
 *
 */
const ruleTester = createRuleTester();

ruleTester.run("no-multiple-declarators", noMultipleDeclaratorsRule, {
  invalid: [
    {
      code: [
        "const availableRules = new Set(Object.keys(rules ?? {})),",
        "  customError = buildCustomErrorRules(availableRules);",
      ].join("\n"),
      errors: [{ messageId: "singleDeclarator" }],
      output: [
        "const availableRules = new Set(Object.keys(rules ?? {}));",
        "const customError = buildCustomErrorRules(availableRules);",
      ].join("\n"),
    },
    {
      code: [
        "export const availableRules = new Set(Object.keys(rules ?? {})),",
        "  customError = buildCustomErrorRules(availableRules);",
      ].join("\n"),
      errors: [{ messageId: "singleDeclarator" }],
    },
    {
      code: [
        "const availableRules = new Set(Object.keys(rules ?? {})),",
        "  /* keep */ customError = buildCustomErrorRules(availableRules);",
      ].join("\n"),
      errors: [{ messageId: "singleDeclarator" }],
    },
  ],
  valid: [
    {
      code: [
        "const availableRules = new Set(Object.keys(rules ?? {}));",
        "const customError = buildCustomErrorRules(availableRules);",
      ].join("\n"),
    },
  ],
});
