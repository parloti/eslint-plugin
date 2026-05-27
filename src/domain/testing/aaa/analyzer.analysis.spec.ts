import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import type { TestBlockAnalysis } from "./types";

import { analyzeTestBlock } from "./analyzer.analysis";
import { countActStatements } from "./analyzer.analysis.helpers";

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
 * Gets the first two call expressions from a fixture program.
 * @param program Input program value.
 * @returns Return value output.
 * @throws {TypeError} Thrown when the fixture does not contain two call-expression statements.
 * @example
 * ```typescript
 * getFirstTwoCallExpressions(program);
 * ```
 */
const getFirstTwoCallExpressions = (
  program: ESTree.Program,
): [ESTree.CallExpression, ESTree.CallExpression] => {
  const callExpressions: ESTree.CallExpression[] = [];

  for (const statement of program.body) {
    if (
      statement.type === "ExpressionStatement" &&
      statement.expression.type === "CallExpression"
    ) {
      callExpressions.push(statement.expression);
    }
  }

  const [firstCallExpression, secondCallExpression] = callExpressions;
  if (firstCallExpression === void 0 || secondCallExpression === void 0) {
    throw new TypeError("Expected two call expressions.");
  }

  return [firstCallExpression, secondCallExpression];
};

/**
 * Gets the first callback statement from a supported test call.
 * @param callExpression Input callExpression value.
 * @returns Return value output.
 * @throws {TypeError} Thrown when the fixture does not contain a callback statement.
 * @example
 * ```typescript
 * getFirstCallbackStatement(callExpression);
 * ```
 */
const getFirstCallbackStatement = (
  callExpression: ESTree.CallExpression,
): ESTree.Statement => {
  const callbackArgument = callExpression.arguments.at(-1);

  if (
    callbackArgument === void 0 ||
    callbackArgument.type === "SpreadElement" ||
    (callbackArgument.type !== "ArrowFunctionExpression" &&
      callbackArgument.type !== "FunctionExpression") ||
    callbackArgument.body.type !== "BlockStatement"
  ) {
    throw new TypeError("Expected a callback block statement.");
  }

  const [statement] = callbackArgument.body.body;
  if (statement === void 0) {
    throw new TypeError("Expected a callback body statement.");
  }

  return statement;
};

/**
 * Analyzes a fixture source when supported.
 * @param sourceText Input sourceText value.
 * @returns Return value output.
 * @example
 * ```typescript
 * analyzeMaybeSource('it("x", () => {});');
 * ```
 */
const analyzeMaybeSource = (
  sourceText: string,
): TestBlockAnalysis | undefined => {
  const program = parseProgram(sourceText);

  return analyzeTestBlock(
    createContext(program, sourceText),
    getCallExpression(program),
  );
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
  const analysis = analyzeMaybeSource(sourceText);

  if (analysis === void 0) {
    throw new TypeError("Expected a supported test block.");
  }

  return analysis;
};

/**
 * Analyzes a fixture after removing the first callback statement location.
 * @param sourceText Input sourceText value.
 * @returns Return value output.
 * @throws {TypeError} Thrown when the fixture is not a supported test block.
 * @example
 * ```typescript
 * analyzeSourceWithoutFirstCallbackLocation('it("x", () => {});');
 * ```
 */
const analyzeSourceWithoutFirstCallbackLocation = (
  sourceText: string,
): TestBlockAnalysis => {
  const program = parseProgram(sourceText);
  const callExpression = getCallExpression(program);
  const statement = getFirstCallbackStatement(callExpression);

  delete statement.loc;

  const analysis = analyzeTestBlock(
    createContext(program, sourceText),
    callExpression,
  );

  if (analysis === void 0) {
    throw new TypeError("Expected a supported test block.");
  }

  return analysis;
};

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
