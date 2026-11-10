import { describe, expect, it } from "vitest";

import {
  analyzeMaybeSource,
  analyzeSource,
  analyzeSourceWithoutFirstCallbackLocation,
  createContext,
  getCallExpression,
  getFirstCallbackStatement,
  getFirstTwoCallExpressions,
  parseProgram,
} from "./analyzer-analysis-fixtures-test-helpers";

describe("AAA analyzer analysis fixture helpers", () => {
  it.each([
    ["an empty program", ""],
    ["a declaration statement", "const value = 1;"],
    ["a non-call expression", "value;"],
  ])(
    "rejects %s when a call expression is required",
    (_description, source) => {
      // Arrange
      const program = parseProgram(source);

      // Act & Assert
      expect(() => getCallExpression(program)).toThrow(
        "Expected a call expression statement.",
      );
    },
  );

  it("accepts a call expression in an expression statement", () => {
    // Arrange
    const program = parseProgram("run();");

    // Act
    const actual = getCallExpression(program);

    // Assert
    expect(actual.type).toBe("CallExpression");
  });

  it("provides an empty comment list when parsed comments are absent", () => {
    // Arrange
    const program = parseProgram("run();");
    delete program.comments;

    // Act
    const actual = createContext(program, "run();").sourceCode.getAllComments();

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("rejects a program with fewer than two call expressions", () => {
    // Arrange
    const program = parseProgram('it("one call", () => {});');

    // Act & Assert
    expect(() => getFirstTwoCallExpressions(program)).toThrow(
      "Expected two call expressions.",
    );
  });

  it("skips non-call statements while collecting call expressions", () => {
    // Arrange
    const program = parseProgram("const value = 1;");

    // Act & Assert
    expect(() => getFirstTwoCallExpressions(program)).toThrow(
      "Expected two call expressions.",
    );
  });

  it.each([
    ["no callback argument", 'it("case");'],
    ["a spread callback", 'it("case", ...callbacks);'],
    ["a non-function callback", 'it("case", callback);'],
    ["an expression-bodied callback", 'it("case", () => run());'],
  ])("rejects %s when a callback block is required", (_description, source) => {
    // Arrange
    const callExpression = getCallExpression(parseProgram(source));

    // Act & Assert
    expect(() => getFirstCallbackStatement(callExpression)).toThrow(
      "Expected a callback block statement.",
    );
  });

  it("rejects an empty callback block", () => {
    // Arrange
    const callExpression = getCallExpression(
      parseProgram('it("case", () => {});'),
    );

    // Act & Assert
    expect(() => getFirstCallbackStatement(callExpression)).toThrow(
      "Expected a callback body statement.",
    );
  });

  it("returns undefined for unsupported wrappers and rejects strict analysis", () => {
    // Arrange
    const source = "beforeEach(() => { setup(); });";

    // Act
    const actualAnalysis = analyzeMaybeSource(source);

    // Assert
    expect(actualAnalysis).toBeUndefined();
    expect(() => analyzeSource(source)).toThrow(
      "Expected a supported test block.",
    );
  });

  it("rejects location-stripped analysis for an unsupported wrapper", () => {
    // Arrange
    const source = "beforeEach(() => { setup(); });";

    // Act & Assert
    expect(() => analyzeSourceWithoutFirstCallbackLocation(source)).toThrow(
      "Expected a supported test block.",
    );
  });
});
