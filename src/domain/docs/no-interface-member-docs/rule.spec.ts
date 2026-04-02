import { describe, expect, it } from "vitest";

import type { Comment } from "./test-helpers";

import { applyFixes, getFixes } from "../test-helpers";
import { noInterfaceMemberDocumentationRule } from "./rule";
import {
  buildSourceText,
  createComment,
  createContext,
  createFunctionNode,
  createInterfaceSample,
  createParameter,
  runFunctionListener,
} from "./test-helpers";

describe("no interface member docs rule", () => {
  it("exposes metadata", () => {
    // Arrange
    const ruleType = noInterfaceMemberDocumentationRule.meta?.type;

    // Act
    const createType = typeof noInterfaceMemberDocumentationRule.create;

    // Assert
    expect(ruleType).toBe("problem");
    expect(createType).toBe("function");
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
});
