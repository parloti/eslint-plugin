import { describe, expect, expectTypeOf, it } from "vitest";

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
    expect(noInterfaceMemberDocumentationRule.meta?.type).toBe("problem");

    expectTypeOf(noInterfaceMemberDocumentationRule.create).toBeFunction();
  });

  it("reports and fixes interface member param docs", () => {
    const { context, node, reports, sourceText } = createInterfaceSample();

    runFunctionListener(context, node);

    expect(reports).toHaveLength(3);
    expect(reports[0]?.messageId).toBe("interfaceMemberDoc");

    const output = applyFixes(sourceText, getFixes(reports));

    expect(output).toContain("@param context The metadata context.");
    expect(output).not.toMatch(
      /@param\s+context\.(?:commentValue|full|startOffset)/u,
    );
  });

  it("skips inline object types", () => {
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

    runFunctionListener(context, node);

    expect(reports).toHaveLength(0);
  });

  it("skips when no JSDoc is present", () => {
    const sourceText =
      "function getLineMeta(context: LineMetaContext): void {}";
    const { context, reports } = createContext(sourceText, []);
    const node = createFunctionNode(sourceText, [
      createParameter("TSTypeReference"),
    ]);

    runFunctionListener(context, node);

    expect(reports).toHaveLength(0);
  });

  it("skips when no parameters exist", () => {
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

    runFunctionListener(context, node);

    expect(reports).toHaveLength(0);
  });

  it("skips when JSDoc comment lacks a range", () => {
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

    runFunctionListener(context, node);

    expect(reports).toHaveLength(0);
  });

  it("skips when JSDoc start range is missing", () => {
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

    runFunctionListener(context, node);

    expect(reports).toHaveLength(0);
  });
});
