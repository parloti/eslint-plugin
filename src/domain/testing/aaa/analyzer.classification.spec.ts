import type * as ESTree from "estree";

import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import { isValidAssertStatement } from "./analyzer.assertions.helpers";
import {
  hasAsyncLogic,
  hasAwait,
  hasCapturableActResult,
  isMeaningfulActStatement,
  isSetupLikeStatement,
} from "./analyzer.classification.helpers";

/** Parser options used by the fixture adapter. */
interface ParseForEslintOptions {
  /** Enables location metadata. */
  loc: boolean;
  /** Enables range metadata. */
  range: boolean;
  /** Parses the fixture as a module. */
  sourceType: "module";
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
 * Parses a fixture program.
 * @param code Source text wrapped in a synthetic async function.
 * @returns Parsed ESTree program.
 * @example
 * ```typescript
 * const program = parseProgram("const value = 1;");
 * void program;
 * ```
 */
const parseProgram = (code: string): ESTree.Program =>
  (parser as unknown as ParserFixtureAdapter).parseForESLint(code, {
    loc: true,
    range: true,
    sourceType: "module",
  }).ast;

/**
 * Reads the first statement from a synthetic function body.
 * @param code Statement source inserted into the fixture function.
 * @returns First statement from the function body.
 * @throws {TypeError} Thrown when the fixture does not contain a function statement.
 * @example
 * ```typescript
 * const statement = getFirstFunctionBodyStatement("const value = 1;");
 * void statement;
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

describe("aaa analyzer statement classification", () => {
  it("classifies action, setup, and assert shapes", () => {
    // Arrange
    const actionStatement = getFirstFunctionBodyStatement(
      "const actualResult = run(input);",
    );
    const assertionStatement = getFirstFunctionBodyStatement(
      "expect(result).toBe(expectedValue);",
    );
    const evaluatedAssertionStatement = getFirstFunctionBodyStatement(
      "expect(run(input)).toBe(expectedValue);",
    );
    const setupStatement = getFirstFunctionBodyStatement(
      "const fixture = createFixture();",
    );
    const uninitializedSetupStatement =
      getFirstFunctionBodyStatement("let fixture;");
    const uninitializedActual =
      getFirstFunctionBodyStatement("let actualResult;");

    // Act
    const actual = {
      actionStatement: isMeaningfulActStatement(actionStatement),
      assertionStatement: isMeaningfulActStatement(assertionStatement),
      evaluatedAssertionStatement: isValidAssertStatement(
        evaluatedAssertionStatement,
      ),
      setupStatement: isSetupLikeStatement(setupStatement),
      uninitializedActual: isValidAssertStatement(uninitializedActual),
      uninitializedSetupStatement: isSetupLikeStatement(
        uninitializedSetupStatement,
      ),
      validActionAssertion: isValidAssertStatement(actionStatement),
      validAssertion: isValidAssertStatement(assertionStatement),
    };

    // Assert
    expect(actual).toStrictEqual({
      actionStatement: true,
      assertionStatement: false,
      evaluatedAssertionStatement: false,
      setupStatement: true,
      uninitializedActual: true,
      uninitializedSetupStatement: true,
      validActionAssertion: false,
      validAssertion: true,
    });
  });

  it("allows assertion-local projections without allowing actions", () => {
    // Arrange
    const assertionLocalProjection = getFirstFunctionBodyStatement(
      "const actualSuggestions = reportDescriptor?.suggest as Rule.SuggestionReportDescriptor[] | undefined;",
    );
    const assertionLocalAction = getFirstFunctionBodyStatement(
      "const actualSuggestions = getSuggestions(reportDescriptor);",
    );

    // Act
    const actual = {
      action: isValidAssertStatement(assertionLocalAction),
      projection: isValidAssertStatement(assertionLocalProjection),
    };

    // Assert
    expect(actual).toStrictEqual({ action: false, projection: true });
  });

  it("classifies wrapped and declared assertion variants", () => {
    // Arrange
    const declaredAssertionStatement = getFirstFunctionBodyStatement(
      "const assertionResult = expect(result).toBe(expectedValue);",
    );
    const evaluatedAssertStatement = getFirstFunctionBodyStatement(
      "assert.equal(run(input), expectedValue);",
    );
    const wrappedAssertionStatement = getFirstFunctionBodyStatement(
      "void expect(result).toBe(expectedValue);",
    );

    // Act
    const actual = {
      declaredAssertionStatement: isValidAssertStatement(
        declaredAssertionStatement,
      ),
      evaluatedAssertStatement: isValidAssertStatement(
        evaluatedAssertStatement,
      ),
      wrappedAssertionStatement: isValidAssertStatement(
        wrappedAssertionStatement,
      ),
    };

    // Assert
    expect(actual).toStrictEqual({
      declaredAssertionStatement: true,
      evaluatedAssertStatement: false,
      wrappedAssertionStatement: true,
    });
  });

  it("treats setup constructors as setup while keeping rule listeners meaningful", () => {
    // Arrange
    const sourceCodeSetup = getFirstFunctionBodyStatement(
      'const sourceCode = new SourceCode("", ast);',
    );
    const eslintSetup = getFirstFunctionBodyStatement(
      "const eslint = new ESLint({});",
    );
    const ruleListenerSetup = getFirstFunctionBodyStatement(
      "const listeners = customRule.create(context);",
    );

    // Act
    const result = {
      eslintSetup: isSetupLikeStatement(eslintSetup),
      ruleListenerSetup: isSetupLikeStatement(ruleListenerSetup),
      sourceCodeSetup: isSetupLikeStatement(sourceCodeSetup),
    };

    // Assert
    expect(result.sourceCodeSetup).toBe(true);
    expect(result.eslintSetup).toBe(true);
    expect(result.ruleListenerSetup).toBe(false);
  });

  it("detects async logic, await usage, and capturable results", () => {
    // Arrange
    const asyncPromise = getFirstFunctionBodyStatement(
      "const deferred = new Promise((resolve) => resolve(void 0));",
    );
    const asyncThen = getFirstFunctionBodyStatement("task.then(handleResult);");
    const awaitCall = getFirstFunctionBodyStatement("await run(input);");
    const capturableRun = getFirstFunctionBodyStatement("run(input);");
    const capturableSetter = getFirstFunctionBodyStatement("setValue(input);");
    const compoundVoidHelper = getFirstFunctionBodyStatement(
      "scheduleAndFlush();",
    );
    const [capturableValue, errorSetup] = [
      getFirstFunctionBodyStatement("value;"),
      getFirstFunctionBodyStatement("const error = new Error('boom');"),
    ];
    const deferredAsyncHelper = getFirstFunctionBodyStatement(
      "const runner = async (): Promise<number> => {\n  await prepareRemoteState();\n  return 1;\n};",
    );

    // Act
    const actual = {
      asyncPromise: hasAsyncLogic(asyncPromise),
      asyncThen: hasAsyncLogic(asyncThen),
      awaitCall: hasAwait(awaitCall),
      capturableRun: hasCapturableActResult(capturableRun),
      capturableSetter: hasCapturableActResult(capturableSetter),
      capturableValue: hasCapturableActResult(capturableValue),
      compoundVoidHelper: hasCapturableActResult(compoundVoidHelper),
      deferredAsyncHelper: hasAsyncLogic(deferredAsyncHelper),
      deferredHelperAwait: hasAwait(deferredAsyncHelper),
      errorSetup: isSetupLikeStatement(errorSetup),
    };

    // Assert
    expect(actual).toStrictEqual({
      asyncPromise: true,
      asyncThen: true,
      awaitCall: true,
      capturableRun: true,
      capturableSetter: false,
      capturableValue: false,
      compoundVoidHelper: false,
      deferredAsyncHelper: false,
      deferredHelperAwait: false,
      errorSetup: true,
    });
  });
});
