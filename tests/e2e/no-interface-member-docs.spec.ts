import { noInterfaceMemberDocumentationRule } from "../../src";
import { createRuleTester } from "../support/rule-tester";

/**
 *
 */
const ruleTester = createRuleTester();

ruleTester.run("no-interface-member-docs", noInterfaceMemberDocumentationRule, {
  invalid: [
    {
      code: [
        "/**",
        " * @param context The metadata context.",
        " * @param context.commentValue The full comment value.",
        " */",
        "function getLineMeta(context: LineMetaContext): void {}",
      ].join("\n"),
      errors: [{ messageId: "interfaceMemberDoc" }],
      output: [
        "/**",
        " * @param context The metadata context.",
        " */",
        "function getLineMeta(context: LineMetaContext): void {}",
      ].join("\n"),
    },
  ],
  valid: [
    {
      code: [
        "/**",
        " * @param context The metadata context.",
        " * @param context.commentValue The full comment value.",
        " */",
        "function getLineMeta(context: { commentValue: string }): void {}",
      ].join("\n"),
    },
  ],
});
