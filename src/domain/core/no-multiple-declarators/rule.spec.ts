import { describe, expect, it } from "vitest";

import type { MockNode } from "./__tests__/no-multiple-declarators-rule-test-helpers";

import {
  createContext,
  createVariableDeclaration,
  runRule,
} from "./__tests__/no-multiple-declarators-rule-test-helpers";
import { noMultipleDeclaratorsRule } from "./rule";

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
    const actualCreateType = typeof create;

    // Assert
    expect(type).toBe("suggestion");
    expect(fixable).toBe("code");
    expect(actualCreateType).toBe("function");
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

  it("builds a replacement fix for split declarations", () => {
    // Arrange
    const sourceText = "const first = 1, second = 2;";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });
    const { context, reports } = createContext(sourceText);
    const fixer = {
      replaceTextRange: (_range: [number, number], text: string) => ({ text }),
    } as never;
    const getReplacement = (): string | undefined => {
      const reportFix = reports[0]?.fix;
      if (typeof reportFix !== "function") {
        return undefined;
      }

      const fixResult = reportFix(fixer);
      if (!fixResult || Array.isArray(fixResult) || !("text" in fixResult)) {
        return undefined;
      }

      return fixResult.text;
    };

    // Act
    const actualReplacement = (runRule(context, declaration), getReplacement());

    // Assert
    expect(actualReplacement).toBe("const first = 1;\nconst second = 2;");
  });

  it("preserves indentation and CRLF line endings in generated fixes", () => {
    // Arrange
    const sourceText = "if (ready) {\r\n  const first = 1, second = 2;\r\n}";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "const",
      sourceText,
      statementText: "const first = 1, second = 2;",
    });
    const { context, reports } = createContext(sourceText);
    const fixer = {
      replaceTextRange: (_range: [number, number], text: string) => ({ text }),
    } as never;
    const getReplacement = (): string | undefined => {
      const reportFix = reports[0]?.fix;
      if (typeof reportFix !== "function") {
        return undefined;
      }

      const fixResult = reportFix(fixer);
      if (!fixResult || Array.isArray(fixResult) || !("text" in fixResult)) {
        return undefined;
      }

      return fixResult.text;
    };

    // Act
    const actualReplacement = (runRule(context, declaration), getReplacement());

    // Assert
    expect(actualReplacement).toBe("const first = 1;\r\n  const second = 2;");
  });

  it("uses sourceCode.getText fallback when raw source text is omitted", () => {
    // Arrange
    const sourceText = "const first = 1, second = 2;";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });
    const { context, reports } = createContext(sourceText, { omitText: true });
    const fixer = {
      replaceTextRange: (_range: [number, number], text: string) => ({ text }),
    } as never;
    const getReplacement = (): string | undefined => {
      const reportFix = reports[0]?.fix;
      if (typeof reportFix !== "function") {
        return undefined;
      }

      const fixResult = reportFix(fixer);
      if (!fixResult || Array.isArray(fixResult) || !("text" in fixResult)) {
        return undefined;
      }

      return fixResult.text;
    };

    // Act
    const actualReplacement = (runRule(context, declaration), getReplacement());

    // Assert
    expect(actualReplacement).toBe("const first = 1;\nconst second = 2;");
  });

  it("does not offer fixes for loop initializers, ambient declarations, or unsupported kinds", () => {
    // Arrange
    const sourceText = "const first = 1, second = 2;";
    const loopDeclaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });
    loopDeclaration.parent = { init: loopDeclaration, type: "ForStatement" };

    const ambientDeclaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });
    ambientDeclaration.declare = true;

    const unsupportedKindDeclaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "using",
      sourceText,
      statementText: sourceText,
    });

    const loopContext = createContext(sourceText);
    const ambientContext = createContext(sourceText);
    const unsupportedContext = createContext(sourceText);

    // Act
    const actualFixes = (() => {
      runRule(loopContext.context, loopDeclaration);
      runRule(ambientContext.context, ambientDeclaration);
      runRule(unsupportedContext.context, unsupportedKindDeclaration);

      return {
        ambient: ambientContext.reports[0]?.fix,
        loop: loopContext.reports[0]?.fix,
        unsupported: unsupportedContext.reports[0]?.fix,
      };
    })();

    // Assert
    expect(actualFixes.loop).toBeUndefined();
    expect(actualFixes.ambient).toBeUndefined();
    expect(actualFixes.unsupported).toBeUndefined();
  });
});
