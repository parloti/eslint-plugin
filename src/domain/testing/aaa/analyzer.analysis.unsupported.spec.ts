import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import { analyzeTestBlock } from "./analyzer";
import { analyzerAnalysisUnsupportedCompanion } from "./analyzer.analysis.unsupported";

describe("aAA analyzer block analysis unsupported calls", () => {
  it("returns undefined for unsupported helper and todo calls", () => {
    // Arrange
    const context = {
      sourceCode: {
        getAllComments: () => [],
        text: "",
      },
    } as unknown as Rule.RuleContext;
    const helperCall = {
      arguments: [],
      callee: { name: "helper", type: "Identifier" },
      optional: false,
      type: "CallExpression",
    } as unknown as ESTree.CallExpression;
    const todoCall = {
      arguments: [{ type: "Literal", value: "todo" }],
      callee: { name: "it", type: "Identifier" },
      optional: false,
      type: "CallExpression",
    } as unknown as ESTree.CallExpression;

    // Act
    const actual = {
      companion: analyzerAnalysisUnsupportedCompanion,
      helperAnalysis: analyzeTestBlock(context, helperCall),
      todoAnalysis: analyzeTestBlock(context, todoCall),
    };

    // Assert
    expect(actual.companion).toBe(true);
    expect(actual.helperAnalysis).toBeUndefined();
    expect(actual.todoAnalysis).toBeUndefined();
  });
});
