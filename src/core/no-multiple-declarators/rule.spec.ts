import { describe, expect, it } from "vitest";

import type { MockNode } from "./rule-test-helpers";

import { noMultipleDeclaratorsRule } from "./rule";
import {
  createContext,
  createVariableDeclaration,
  runRule,
} from "./rule-test-helpers";

/** Variable declaration fixture with two declarators. */
interface DeclarationWithTwoDeclarators extends MockNode {
  /** Pair of declarators used by the test fixture. */
  declarations: [MockNode, MockNode];
}

describe("no-multiple-declarators rule", () => {
  it("exposes metadata", () => {
    // Arrange
    const { create, meta } = noMultipleDeclaratorsRule;
    const { fixable, type } = meta ?? {};

    // Act
    const createType = typeof create;

    // Assert
    expect(type).toBe("suggestion");
    expect(fixable).toBe("code");
    expect(createType).toBe("function");
  });

  it("reports declarations with multiple declarators", () => {
    // Arrange
    const sourceText =
      "const availableRules = rules, customError = buildError();";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["availableRules = rules", "customError = buildError()"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.nodeType).toBe("VariableDeclaration");
    expect(reports[0]?.fix).toBeTypeOf("function");
  });

  it("skips declarations that already have one declarator", () => {
    // Arrange
    const sourceText = "const availableRules = rules;";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["availableRules = rules"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips malformed declaration nodes without a declarations array", () => {
    // Arrange
    const sourceText = "const availableRules = rules;";
    const declaration = {
      kind: "const",
      range: [0, sourceText.length],
      type: "VariableDeclaration",
    } satisfies Parameters<typeof runRule>[1];
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("reports without an autofix when comments separate declarators", () => {
    // Arrange
    const sourceText = "const first = 1, /* keep */ second = 2;";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toStrictEqual([
      {
        fix: void 0,
        messageId: "singleDeclarator",
        nodeType: "VariableDeclaration",
      },
    ]);
  });

  it("reports exported declarations without an autofix", () => {
    // Arrange
    const sourceText = "export const first = 1, second = 2;";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "const",
      sourceText,
      statementText: "const first = 1, second = 2;",
    });
    declaration.parent = { type: "ExportNamedDeclaration" };
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports[0]?.fix).toBeUndefined();
    expect(reports[0]?.messageId).toBe("singleDeclarator");
  });

  it("reports without an autofix when any declarator range is missing", () => {
    // Arrange
    const sourceText = "const first = 1, second = 2;";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    }) as DeclarationWithTwoDeclarators;
    delete declaration.declarations[1].range;

    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports[0]?.fix).toBeUndefined();
    expect(reports[0]?.messageId).toBe("singleDeclarator");
  });
});
