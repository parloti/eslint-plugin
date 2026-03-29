/* eslint max-lines: ["error", 320] -- Helper JSDoc and fixture setup make this focused spec exceed the default line limit. */

import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import type { TestBlockAnalysis } from "./types";

import {
  analyzeTestBlock,
  getAssertDeclaredIdentifiers,
  getAssertionIdentifiers,
} from "./analyzer";

/** Parser options used by the fixture adapter. */
interface ParseForEslintOptions {
  /** Enables location metadata. */
  loc: boolean;

  /** Enables range metadata. */
  range: boolean;

  /** Parses the fixture as a module. */
  sourceType: "module";
}

/** Parsed program wrapper that preserves comment metadata. */
interface ParserAstWithComments extends ESTree.Program {
  /** Comments attached by the parser when present. */
  comments?: ReturnType<
    Rule.RuleContext["sourceCode"]["getAllComments"]
  >[number][];
}

/** Parser surface used by the tests. */
interface ParserFixtureAdapter {
  /** Parses source text with ESLint-compatible options. */
  parseForESLint: (
    sourceText: string,
    options: ParseForEslintOptions,
  ) => ParserParseResult;
}

/** Parser result returned by the fixture adapter. */
interface ParserParseResult {
  /** Parsed ESTree program. */
  ast: ESTree.Program;
}

/**
 * Parses a fixture program with comments.
 * @param code Input code value.
 * @returns Return value output.
 * @example
 * ```typescript
 * parseProgram('it("x", () => {});');
 * ```
 */
const parseProgram = (code: string): ParserAstWithComments =>
  (parser as unknown as ParserFixtureAdapter).parseForESLint(code, {
    loc: true,
    range: true,
    sourceType: "module",
  }).ast as ParserAstWithComments;

/**
 * Creates a minimal rule context for fixture analysis.
 * @param program Input program value.
 * @param sourceText Input sourceText value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createContext(program, sourceText);
 * ```
 */
const createContext = (
  program: ParserAstWithComments,
  sourceText: string,
): Rule.RuleContext =>
  ({
    sourceCode: {
      ast: program,
      getAllComments: () => program.comments ?? [],
      text: sourceText,
    },
  }) as never;

/**
 * Gets the first call expression from a fixture program.
 * @param program Input program value.
 * @returns Return value output.
 * @throws {TypeError} Thrown when the fixture does not contain a call-expression statement.
 * @example
 * ```typescript
 * getCallExpression(program);
 * ```
 */
const getCallExpression = (program: ESTree.Program): ESTree.CallExpression => {
  const [statement] = program.body;

  if (
    statement?.type !== "ExpressionStatement" ||
    statement.expression.type !== "CallExpression"
  ) {
    throw new TypeError("Expected a call expression statement.");
  }

  return statement.expression;
};

/**
 * Analyzes a supported fixture source.
 * @param sourceText Input sourceText value.
 * @returns Return value output.
 * @throws {TypeError} Thrown when the fixture is not a supported test block.
 * @example
 * ```typescript
 * analyzeSource('it("x", () => {});');
 * ```
 */
const analyzeSource = (sourceText: string): TestBlockAnalysis => {
  const program = parseProgram(sourceText);
  const analysis = analyzeTestBlock(
    createContext(program, sourceText),
    getCallExpression(program),
  );

  if (analysis === void 0) {
    throw new TypeError("Expected a supported test block.");
  }

  return analysis;
};

/**
 * Gets the first function-body statement from a fixture.
 * @param code Input code value.
 * @returns Return value output.
 * @throws {TypeError} Thrown when the fixture does not contain a function statement.
 * @example
 * ```typescript
 * getFirstFunctionBodyStatement("const value = 1;");
 * ```
 */
const getFirstFunctionBodyStatement = (code: string): ESTree.Statement => {
  const program = parseProgram(
    `async function demo(): Promise<void> {\n${code}\n}`,
  );
  const [declaration] = program.body;

  if (declaration?.type !== "FunctionDeclaration") {
    throw new TypeError("Expected a function declaration.");
  }

  const [statement] = declaration.body.body;
  if (statement === void 0) {
    throw new TypeError("Expected a function body statement.");
  }

  return statement;
};

describe("aAA analyzer assertion helpers", () => {
  it("extracts identifiers from expect and assert calls", () => {
    // Arrange
    const expectStatement = getFirstFunctionBodyStatement(
      "expect(actualResult).toBe(expectedValue);",
    );
    const assertStatement = getFirstFunctionBodyStatement(
      "assert.equal(actualValue, expectedValue);",
    );

    // Act
    const result = {
      assertCall: getAssertionIdentifiers(assertStatement),
      expectCall: getAssertionIdentifiers(expectStatement),
    };

    // Assert
    expect(result.expectCall).toStrictEqual({
      actual: "actualResult",
      expected: "expectedValue",
    });
    expect(result.assertCall).toStrictEqual({
      actual: "actualValue",
      expected: "expectedValue",
    });
  });

  it("handles spread operands in expect and assert calls", () => {
    // Arrange
    const spreadActualStatement = getFirstFunctionBodyStatement(
      "assert.equal(...values);",
    );
    const spreadExpectedStatement = getFirstFunctionBodyStatement(
      "assert.equal(actualValue, ...values);",
    );
    const expectSpreadActualStatement = getFirstFunctionBodyStatement(
      "expect(...values).toBe(expectedValue);",
    );
    const expectSpreadExpectedStatement = getFirstFunctionBodyStatement(
      "expect(actualValue).toBe(...values);",
    );

    // Act
    const result = {
      expectSpreadActual: getAssertionIdentifiers(expectSpreadActualStatement),
      expectSpreadExpected: getAssertionIdentifiers(
        expectSpreadExpectedStatement,
      ),
      spreadActual: getAssertionIdentifiers(spreadActualStatement),
      spreadExpected: getAssertionIdentifiers(spreadExpectedStatement),
    };

    // Assert
    expect(result.spreadActual).toStrictEqual({
      actual: void 0,
      expected: void 0,
    });
    expect(result.spreadExpected).toStrictEqual({
      actual: void 0,
      expected: void 0,
    });
    expect(result.expectSpreadActual).toStrictEqual({
      actual: void 0,
      expected: "expectedValue",
    });
    expect(result.expectSpreadExpected).toStrictEqual({
      actual: "actualValue",
      expected: void 0,
    });
  });

  it("ignores declarations and unrelated member expectations", () => {
    // Arrange
    const declarationStatement = getFirstFunctionBodyStatement(
      "const actualValue = 1;",
    );
    const expressionStatement = getFirstFunctionBodyStatement("actualValue;");
    const memberExpectationStatement = getFirstFunctionBodyStatement(
      "service.expectation().toBe(expectedValue);",
    );

    // Act
    const result = {
      declaration: getAssertionIdentifiers(declarationStatement),
      expression: getAssertionIdentifiers(expressionStatement),
      memberExpectation: getAssertionIdentifiers(memberExpectationStatement),
    };

    // Assert
    expect(result.declaration).toStrictEqual({
      actual: void 0,
      expected: void 0,
    });
    expect(result.expression).toStrictEqual({
      actual: void 0,
      expected: void 0,
    });
    expect(result.memberExpectation).toStrictEqual({
      actual: void 0,
      expected: void 0,
    });
  });

  it("collects assert-local declared identifiers", () => {
    // Arrange
    const sourceText = [
      'it("tracks assert locals", () => {',
      "  // Arrange",
      "  const input = 1;",
      "",
      "  // Act",
      "  const computedResult = run(input);",
      "",
      "  // Assert",
      "  const actualResult = computedResult;",
      "  const expectedValue = 1;",
      "  expect(actualResult).toBe(expectedValue);",
      "});",
    ].join("\n");

    // Act
    const identifiers = [
      ...getAssertDeclaredIdentifiers(analyzeSource(sourceText)).keys(),
    ];

    // Assert
    expect(identifiers).toStrictEqual(["actualResult", "expectedValue"]);
  });

  it("ignores destructured Assert declarations when collecting identifiers", () => {
    // Arrange
    const sourceText = [
      'it("tracks assert locals", () => {',
      "  // Arrange",
      "  const input = 1;",
      "",
      "  // Act",
      "  const computedResult = run(input);",
      "",
      "  // Assert",
      "  const { actualResult } = computedResult;",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const identifiers = [
      ...getAssertDeclaredIdentifiers(analyzeSource(sourceText)).keys(),
    ];

    // Assert
    expect(identifiers).toStrictEqual([]);
  });
});
