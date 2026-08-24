import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import {
  analyzeMaybeSource,
  analyzeSource,
  analyzeSourceWithoutFirstCallbackLocation,
  getFirstTwoCallExpressions,
  parseProgram,
} from "./__tests__/analyzer-analysis-fixtures-test-helpers";
import { analyzeTestBlock } from "./analyzer.analysis";
import { countActStatements } from "./analyzer.analysis.helpers";

describe("aAA analyzer block analysis", () => {
  it("supports parameterized test wrappers based on it.each and test.each", () => {
    // Arrange
    const parameterizedItSource = [
      'it.each([[1]])("tracks rows", (input) => {',
      "  // Act",
      "  const actualResult = run(input);",
      "",
      "  // Assert",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\n");
    const parameterizedTestSource = [
      'test.each([[1]])("tracks rows", (input) => {',
      "  // Act",
      "  const actualResult = run(input);",
      "",
      "  // Assert",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const actual = (() => {
      const actualItAnalysis = analyzeMaybeSource(parameterizedItSource);
      const actualTestAnalysis = analyzeMaybeSource(parameterizedTestSource);

      return {
        actualItAnalysis,
        actualItPhases: actualItAnalysis?.sectionComments.map(
          (comment) => comment.phases,
        ),
        actualTestAnalysis,
        actualTestPhases: actualTestAnalysis?.sectionComments.map(
          (comment) => comment.phases,
        ),
      };
    })();

    // Assert
    expect(actual.actualItAnalysis).toBeDefined();
    expect(actual.actualItPhases).toStrictEqual([["Act"], ["Assert"]]);
    expect(actual.actualTestAnalysis).toBeDefined();
    expect(actual.actualTestPhases).toStrictEqual([["Act"], ["Assert"]]);
  });

  it("preserves combined AAA phases for statements", () => {
    // Arrange
    const sourceText = [
      'it("tracks combined sections", () => {',
      "  // Arrange & Act & Assert",
      "  expect(run()).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const [result, actStatementCount] = ((): readonly [
      ReturnType<typeof analyzeSource>,
      number,
    ] => {
      const analysis = analyzeSource(sourceText);

      return [analysis, countActStatements(analysis)] as const;
    })();

    // Assert
    expect(result.statements[0]?.phases).toStrictEqual([
      "Arrange",
      "Act",
      "Assert",
    ]);
    expect(actStatementCount).toBe(0);
  });

  it("analyzes supported test blocks and counts Act statements", () => {
    // Arrange
    const sourceText = [
      'it("tracks AAA sections", () => {',
      "  // Arrange",
      "  const input = 1;",
      "",
      "  // Act",
      "  const actualResult = run(input);",
      "",
      "  // Assert",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const [result, actStatementCount] = ((): readonly [
      ReturnType<typeof analyzeSource>,
      number,
    ] => {
      const analysis = analyzeSource(sourceText);

      return [analysis, countActStatements(analysis)] as const;
    })();

    // Assert
    expect(result.newline).toBe("\n");
    expect(result.sectionComments).toHaveLength(3);
    expect(actStatementCount).toBe(1);
  });

  it("detects CRLF newlines and tolerates statements without location metadata", () => {
    // Arrange
    const sourceText = [
      'it("tracks AAA sections", () => {',
      "  // Arrange",
      "  const input = 1;",
      "",
      "  // Act",
      "  const actualResult = run(input);",
      "",
      "  // Assert",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\r\n");

    // Act
    const result = analyzeSourceWithoutFirstCallbackLocation(sourceText);

    // Assert
    expect(result.newline).toBe("\r\n");
    expect(result.statements[0]?.phase).toBeUndefined();
    expect(result.statements[0]?.phases).toStrictEqual([]);
  });

  it("ignores AAA section comments nested inside top-level statements", () => {
    // Arrange
    const sourceText = [
      'it("ignores nested helper markers", () => {',
      "  // Arrange",
      "  const helper = () => {",
      "    // Act",
      "    return run();",
      "  };",
      "",
      "  // Act",
      "  const actual = helper();",
      "",
      "  // Assert",
      "  expect(actual).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const actual = (() => {
      const actualAnalysis = analyzeSource(sourceText);

      return {
        actualAnalysis,
        actualSectionPhases: actualAnalysis.sectionComments.map(
          (section) => section.phases,
        ),
      };
    })();

    // Assert
    expect(actual.actualAnalysis.sectionComments).toHaveLength(3);
    expect(actual.actualSectionPhases).toStrictEqual([
      ["Arrange"],
      ["Act"],
      ["Assert"],
    ]);
  });

  it("reuses cached comments for repeated analysis in the same source", () => {
    // Arrange
    const sourceText = [
      'it("first", () => {',
      "  // Arrange",
      "  const firstInput = 1;",
      "});",
      'it("second", () => {',
      "  // Arrange",
      "  const secondInput = 2;",
      "});",
    ].join("\n");

    // Act
    const actual = (() => {
      const program = parseProgram(sourceText);
      let actualGetAllCommentsCallCount = 0;
      const context = {
        sourceCode: {
          ast: program,
          getAllComments: () => {
            actualGetAllCommentsCallCount += 1;
            return program.comments ?? [];
          },
          text: sourceText,
        },
      } as Rule.RuleContext;
      const [firstCallExpression, secondCallExpression] =
        getFirstTwoCallExpressions(program);
      const actualFirstAnalysis = analyzeTestBlock(
        context,
        firstCallExpression,
      );
      const actualSecondAnalysis = analyzeTestBlock(
        context,
        secondCallExpression,
      );

      return {
        actualFirstAnalysis,
        actualGetAllCommentsCallCount,
        actualSecondAnalysis,
      };
    })();

    // Assert
    expect(actual.actualFirstAnalysis).toBeDefined();
    expect(actual.actualSecondAnalysis).toBeDefined();
    expect(actual.actualGetAllCommentsCallCount).toBe(1);
  });
});
