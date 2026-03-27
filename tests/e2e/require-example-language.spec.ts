import { requireExampleLanguageRule } from "../../src";
import { createRuleTester } from "../support/rule-tester";

/**
 *
 */
const ruleTester = createRuleTester();

ruleTester.run("require-example-language", requireExampleLanguageRule, {
  invalid: [
    {
      code: [
        "/**",
        " * @example const value = 1;",
        " */",
        "export function demo(): void {}",
      ].join("\n"),
      errors: [{ messageId: "missingFence" }],
      output: [
        "/**",
        " * @example",
        " * ```typescript",
        " *  const value = 1;",
        " * ```",
        " */",
        "export function demo(): void {}",
      ].join("\n"),
    },
    {
      code: [
        "/**",
        " * @example",
        " * ```",
        " * const value = 1;",
        " * ```",
        " */",
        "export function demo(): void {}",
      ].join("\n"),
      errors: [{ messageId: "missingLanguage" }],
      output: [
        "/**",
        " * @example",
        " * ```typescript",
        " * const value = 1;",
        " * ```",
        " */",
        "export function demo(): void {}",
      ].join("\n"),
    },
  ],
  valid: [
    {
      code: [
        "/**",
        " * @example",
        " * ```typescript",
        " * const value = 1;",
        " * ```",
        " */",
        "export function demo(): void {}",
      ].join("\n"),
    },
  ],
});
