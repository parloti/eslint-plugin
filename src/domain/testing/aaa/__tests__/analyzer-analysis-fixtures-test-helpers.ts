import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { parser } from "typescript-eslint";

import type { TestBlockAnalysis } from "../types";

import { analyzeTestBlock } from "../analyzer.analysis";

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

// Fixture utilities shared by the analyzer analysis specifications.
export {
  analyzeMaybeSource,
  analyzeSource,
  analyzeSourceWithoutFirstCallbackLocation,
  createContext,
  getCallExpression,
  getFirstCallbackStatement,
  getFirstTwoCallExpressions,
  parseProgram,
};
