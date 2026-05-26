import { describe, expect, it } from "vitest";

import type { MockNode } from "./rule-test-helpers";

import {
  createContext,
  createVariableDeclaration,
  runRule,
} from "./rule-test-helpers";
import { applyFixes, getFixes } from "./rule.fixes";
import { ruleGuardrailsSuiteName } from "./rule.guardrails";

describe(ruleGuardrailsSuiteName, () => {
  it("reports loop initializers without exposing a fix", () => {
    // Arrange
    const sourceText =
      "for (let index = 0, total = 1; index < total; index += 1) {}";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["index = 0", "total = 1"],
      kind: "let",
      sourceText,
      statementText: "let index = 0, total = 1",
    });
    declaration.parent = {
      init: declaration,
      type: "ForStatement",
    };
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports for-of loop declarations without exposing a fix", () => {
    // Arrange
    const sourceText = "for (const key of entries) {}";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["key", "of entries"],
      kind: "const",
      sourceText,
      statementText: "const key of entries",
    });
    declaration.parent = {
      left: declaration,
      type: "ForOfStatement",
    };
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports for-await-of loop declarations without exposing a fix", () => {
    // Arrange
    const sourceText = "for await (const key of entries) {}";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["key", "of entries"],
      kind: "const",
      sourceText,
      statementText: "const key of entries",
    });
    declaration.parent = {
      left: declaration,
      type: "ForAwaitOfStatement",
    };
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports separator comments without exposing a fix", () => {
    // Arrange
    const sourceText =
      "const availableRules = rules, /* keep */ customError = buildError();";
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
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports declarations with missing declarator ranges without exposing a fix", () => {
    // Arrange
    const sourceText =
      "const availableRules = rules, customError = buildError();";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["availableRules = rules", "customError = buildError()"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });
    delete declaration.declarations?.[1]?.range;
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports declarations without fix metadata when the declaration kind is unavailable", () => {
    // Arrange
    const sourceText =
      "const availableRules = rules, customError = buildError();";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["availableRules = rules", "customError = buildError()"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });

    delete declaration.kind;
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports exported declarations without exposing a fix", () => {
    // Arrange
    const sourceText =
      "export const availableRules = rules, customError = buildError();";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["availableRules = rules", "customError = buildError()"],
      kind: "const",
      sourceText,
      statementText:
        "const availableRules = rules, customError = buildError();",
    });
    declaration.parent = { type: "ExportNamedDeclaration" } satisfies MockNode;
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports export-default wrapped declarations without exposing a fix", () => {
    // Arrange
    const sourceText =
      "const availableRules = rules, customError = buildError();";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["availableRules = rules", "customError = buildError()"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });
    declaration.parent = {
      type: "ExportDefaultDeclaration",
    } satisfies MockNode;
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports ambient TypeScript declarations without exposing a fix", () => {
    // Arrange
    const sourceText = "declare const first: string, second: string;";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["first: string", "second: string"],
      kind: "const",
      sourceText,
      statementText: "const first: string, second: string;",
    });
    declaration.declare = true;
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports declaration kinds outside var/let/const without exposing a fix", () => {
    // Arrange
    const sourceText = "using first = create(), second = create();";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["first = create()", "second = create()"],
      kind: "using",
      sourceText,
      statementText: sourceText,
    });
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("preserves CRLF line separators during autofix", () => {
    // Arrange
    const sourceText = [
      "if (ready) {",
      "  const first = 1, second = 2;",
      "}",
    ].join("\r\n");
    const declaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "const",
      sourceText,
      statementText: "const first = 1, second = 2;",
    });
    const { context, reports } = createContext(sourceText);
    const expected = [
      "if (ready) {",
      "  const first = 1;",
      "  const second = 2;",
      "}",
    ].join("\r\n");

    // Act
    const actual = ((): string => {
      runRule(context, declaration);

      return applyFixes(sourceText, getFixes(reports));
    })();

    // Assert
    expect(actual).toBe(expected);
  });

  it("preserves mixed tab-space indentation during autofix", () => {
    // Arrange
    const sourceText = [
      "if (ready) {",
      "\t  const first = 1, second = 2;",
      "}",
    ].join("\n");
    const declaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "const",
      sourceText,
      statementText: "const first = 1, second = 2;",
    });
    const { context, reports } = createContext(sourceText);
    const expected = [
      "if (ready) {",
      "\t  const first = 1;",
      "\t  const second = 2;",
      "}",
    ].join("\n");

    // Act
    const actual = ((): string => {
      runRule(context, declaration);

      return applyFixes(sourceText, getFixes(reports));
    })();

    // Assert
    expect(actual).toBe(expected);
  });
});
