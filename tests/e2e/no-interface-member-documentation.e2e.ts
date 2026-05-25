import { describe, expect, it } from "vitest";

import { noInterfaceMemberDocumentationRule } from "../../src";
import { runRuleCase } from "../support";

describe("no-interface-member-docs e2e", () => {
  it("removes interface-member parameter documentation", () => {
    // Arrange
    const testCase = {
      code: [
        "/**",
        " * @param context The metadata context.",
        " * @param context.commentValue The full comment value.",
        " */",
        "function getLineMeta(context: LineMetaContext): void {}",
      ].join("\n"),
      output: [
        "/**",
        " * @param context The metadata context.",
        " */",
        "function getLineMeta(context: LineMetaContext): void {}",
      ].join("\n"),
    };

    // Act
    const result = runRuleCase(
      "no-interface-member-docs",
      noInterfaceMemberDocumentationRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(["interfaceMemberDoc"]);
    expect(result.output).toBe(testCase.output);
  });

  it("accepts inline object parameters", () => {
    // Arrange
    const testCase = {
      code: [
        "/**",
        " * @param context The metadata context.",
        " * @param context.commentValue The full comment value.",
        " */",
        "function getLineMeta(context: { commentValue: string }): void {}",
      ].join("\n"),
    };

    // Act
    const result = runRuleCase(
      "no-interface-member-docs",
      noInterfaceMemberDocumentationRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
