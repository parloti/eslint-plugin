import type * as ESTree from "estree";

import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import { analyzerClassificationMemberPatterns } from "./analyzer.classification.member-patterns";

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

describe("aaa analyzer classification member patterns", () => {
  it("covers computed calls and unsupported setup shapes", () => {
    // Arrange
    const statements = {
      computedCall: getFirstFunctionBodyStatement("dependencies[key](input);"),
      dependencySetup: getFirstFunctionBodyStatement("dependencies[key]();"),
      optionalCall: getFirstFunctionBodyStatement(
        "dependencies?.run?.(input);",
      ),
      stringComputedCall: getFirstFunctionBodyStatement(
        'dependencies["run"](input);',
      ),
      valueSetup: getFirstFunctionBodyStatement("value;"),
    };

    // Act
    const result = {
      computedCall: analyzerClassificationMemberPatterns.hasCapturableActResult(
        statements.computedCall,
      ),
      dependencySetup:
        analyzerClassificationMemberPatterns.isSetupLikeStatement(
          statements.dependencySetup,
        ),
      optionalCall: analyzerClassificationMemberPatterns.hasCapturableActResult(
        statements.optionalCall,
      ),
      stringComputedCall:
        analyzerClassificationMemberPatterns.hasCapturableActResult(
          statements.stringComputedCall,
        ),
      valueSetup: analyzerClassificationMemberPatterns.isSetupLikeStatement(
        statements.valueSetup,
      ),
    };

    // Assert
    expect(result.valueSetup).toBe(false);
    expect(result.dependencySetup).toBe(false);
    expect(result.optionalCall).toBe(true);
    expect(result.computedCall).toBe(true);
    expect(result.stringComputedCall).toBe(true);
  });

  it("treats unsupported action and assertion member patterns correctly", () => {
    // Arrange
    const conditionalAction = getFirstFunctionBodyStatement(
      "if (ready) { run(); }",
    );
    const multiDeclarationAction = getFirstFunctionBodyStatement(
      "const actualResult = run(), nextResult = run();",
    );
    const assertMemberCall = getFirstFunctionBodyStatement(
      "assert.equal(actual, expected);",
    );
    const indirectFactoryCall = getFirstFunctionBodyStatement("(factory())();");
    const nonAssertMemberCall = getFirstFunctionBodyStatement(
      "service.execute(actual);",
    );
    const setupLikeComputedDependency = getFirstFunctionBodyStatement(
      "dependencies[key]();",
    );

    // Act
    const actual = {
      assertMemberCall:
        analyzerClassificationMemberPatterns.hasAssertion(assertMemberCall),
      conditionalAction:
        analyzerClassificationMemberPatterns.isMeaningfulActStatement(
          conditionalAction,
        ),
      indirectFactoryCall:
        analyzerClassificationMemberPatterns.hasAssertion(indirectFactoryCall),
      multiDeclarationAction:
        analyzerClassificationMemberPatterns.isMeaningfulActStatement(
          multiDeclarationAction,
        ),
      nonAssertMemberCall:
        analyzerClassificationMemberPatterns.hasAssertion(nonAssertMemberCall),
      setupLikeComputedDependency:
        analyzerClassificationMemberPatterns.isSetupLikeStatement(
          setupLikeComputedDependency,
        ),
    };

    // Assert
    expect(actual).toStrictEqual({
      assertMemberCall: true,
      conditionalAction: false,
      indirectFactoryCall: false,
      multiDeclarationAction: false,
      nonAssertMemberCall: false,
      setupLikeComputedDependency: false,
    });
  });
});
