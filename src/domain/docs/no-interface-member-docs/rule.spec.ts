import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { Comment } from "./__tests__/no-interface-member-documentation-test-helpers";

import { applyFixes, getFixes } from "../__tests__/documentation-test-helpers";
import {
  buildSourceText,
  createComment,
  createContext,
  createFunctionNode,
  createInterfaceSample,
  createParameter,
  runFunctionListener,
} from "./__tests__/no-interface-member-documentation-test-helpers";
import { noInterfaceMemberDocumentationRule } from "./rule";

describe("no interface member docs rule", () => {
  it("exposes metadata", () => {
    // Arrange
    const ruleType = noInterfaceMemberDocumentationRule.meta?.type;

    // Act
    const actualCreateType = typeof noInterfaceMemberDocumentationRule.create;

    // Assert
    expect(ruleType).toBe("problem");
    expect(actualCreateType).toBe("function");
  });

  it("reports and fixes interface member param docs", () => {
    // Arrange
    const { context, node, reports, sourceText } = createInterfaceSample();

    // Act
    const actualOutput = ((): string => {
      runFunctionListener(context, node);

      return applyFixes(sourceText, getFixes(reports));
    })();

    // Assert
    expect(reports).toHaveLength(3);
    expect(reports[0]?.messageId).toBe("interfaceMemberDoc");
    expect(actualOutput).toContain("@param context The metadata context.");
    expect(actualOutput).not.toMatch(
      /@param\s+context\.(?:commentValue|full|startOffset)/u,
    );
  });

  it("skips inline object types", () => {
    // Arrange
    const commentValue = [
      "*",
      " * @param context The metadata context.",
      " * @param context.commentValue The full comment value.",
      " ",
    ].join("\n");
    const sourceText = buildSourceText(commentValue);
    const comment = createComment(commentValue, sourceText);
    const { context, reports } = createContext(sourceText, [comment]);
    const node = createFunctionNode(sourceText, [
      createParameter("TSTypeLiteral"),
    ]);

    // Act
    runFunctionListener(context, node);

    // Assert
    expect(reports).toHaveLength(0);
  });

  it("skips when no JSDoc is present", () => {
    // Arrange
    const sourceText =
      "function getLineMeta(context: LineMetaContext): void {}";
    const { context, reports } = createContext(sourceText, []);
    const node = createFunctionNode(sourceText, [
      createParameter("TSTypeReference"),
    ]);

    // Act
    runFunctionListener(context, node);

    // Assert
    expect(reports).toHaveLength(0);
  });

  it("skips when no parameters exist", () => {
    // Arrange
    const commentValue = [
      "*",
      " * @param context The metadata context.",
      " * @param context.value The metadata value.",
      " ",
    ].join("\n");
    const sourceText = buildSourceText(commentValue);
    const comment = createComment(commentValue, sourceText);
    const { context, reports } = createContext(sourceText, [comment]);
    const node = createFunctionNode(sourceText, []);

    // Act
    runFunctionListener(context, node);

    // Assert
    expect(reports).toHaveLength(0);
  });

  it("skips when JSDoc comment lacks a range", () => {
    // Arrange
    const commentValue = [
      "*",
      " * @param context The metadata context.",
      " * @param context.value The metadata value.",
      " ",
    ].join("\n");
    const sourceText = buildSourceText(commentValue);
    const comment = { type: "Block", value: commentValue } as Comment;
    const { context, reports } = createContext(sourceText, [comment]);
    const node = createFunctionNode(sourceText, [
      createParameter("TSTypeReference"),
    ]);

    // Act
    runFunctionListener(context, node);

    // Assert
    expect(reports).toHaveLength(0);
  });

  it("skips when JSDoc start range is missing", () => {
    // Arrange
    const commentValue = [
      "*",
      " * @param context The metadata context.",
      " * @param context.value The metadata value.",
      " ",
    ].join("\n");
    const sourceText = buildSourceText(commentValue);
    const comment = {
      range: [void 0 as unknown as number, sourceText.indexOf("*/") + 2],
      type: "Block",
      value: commentValue,
    } as Comment;
    const { context, reports } = createContext(sourceText, [comment]);
    const node = createFunctionNode(sourceText, [
      createParameter("TSTypeReference"),
    ]);

    // Act
    runFunctionListener(context, node);

    // Assert
    expect(reports).toHaveLength(0);
  });

  it("skips when the closest JSDoc is not adjacent to the function", () => {
    // Arrange
    const commentValue = [
      "*",
      " * @param context The metadata context.",
      " * @param context.value The metadata value.",
      " ",
    ].join("\n");
    const sourceText = [
      "/**",
      commentValue.trimEnd(),
      "*/",
      "const separator = true;",
      "function getLineMeta(context: LineMetaContext): void {}",
    ].join("\n");
    const comment = createComment(commentValue, sourceText);
    const { context, reports } = createContext(sourceText, [comment]);
    const node = createFunctionNode(sourceText, [
      createParameter("TSTypeReference"),
    ]);

    // Act
    runFunctionListener(context, node);

    // Assert
    expect(reports).toHaveLength(0);
  });

  it("reports and fixes class method member docs", () => {
    // Arrange
    const commentValue = [
      "*",
      " * @param context The metadata context.",
      " * @param context.value The metadata value.",
      " ",
    ].join("\n");
    const sourceText = [
      "class Example {",
      "  /**",
      commentValue.trimEnd(),
      "  */",
      "  run(context: LineMetaContext): void {}",
      "}",
    ].join("\n");
    const commentStart = 18;
    const commentEnd = 112;
    const comment = {
      range: [commentStart, commentEnd],
      type: "Block",
      value: commentValue,
    } as Comment;
    const { context, reports } = createContext(sourceText, [comment]);
    const node = {
      params: [createParameter("TSTypeReference")],
      range: [115, 155],
      type: "MethodDefinition",
      value: {
        params: [createParameter("TSTypeReference")],
        range: [115, 155],
        type: "FunctionExpression",
      },
    } as unknown as Parameters<
      NonNullable<Rule.RuleListener["MethodDefinition"]>
    >[0];

    // Act
    const actualListenerResult = noInterfaceMemberDocumentationRule
      .create(context)
      .MethodDefinition?.(node);

    // Assert
    expect(actualListenerResult).toBeUndefined();
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("interfaceMemberDoc");
  });

  it("does not fail when MethodDefinition value is missing", () => {
    // Arrange
    const sourceText =
      "class Example { run(context: LineMetaContext): void {} }";
    const { context, reports } = createContext(sourceText, []);
    const node = {
      params: [createParameter("TSTypeReference")],
      range: [16, sourceText.length - 2],
      type: "MethodDefinition",
    } as unknown as Parameters<
      NonNullable<Rule.RuleListener["MethodDefinition"]>
    >[0];

    // Act
    const actualListenerResult = noInterfaceMemberDocumentationRule
      .create(context)
      .MethodDefinition?.(node);

    // Assert
    expect(actualListenerResult).toBeUndefined();
    expect(reports).toStrictEqual([]);
  });
});
