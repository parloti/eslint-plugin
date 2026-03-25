import { describe, expect, it } from "vitest";
import { parser } from "typescript-eslint";
import type * as ESTree from "estree";

import {
  aaaPhaseOrder,
  analyzeTestBlock,
  countActStatements,
  getAssertDeclaredIdentifiers,
  getAssertionIdentifiers,
  getIndentationAtOffset,
  getLineStartRange,
  getSectionPhases,
  hasAssertion,
  hasAsyncLogic,
  hasAwait,
  hasBlankLineBeforeComment,
  hasCapturableActResult,
  hasMutation,
  isMeaningfulActStatement,
  isSetupLikeStatement,
  isValidAssertStatement,
  usesPrefix,
} from "./analyzer";

interface ParseForEslintOptions {
  loc: boolean;
  range: boolean;
  sourceType: "module";
}

interface ParserFixtureResult {
  ast: ESTree.Program;
}

interface ParserFixtureAdapter {
  parseForESLint: (
    sourceText: string,
    options: ParseForEslintOptions,
  ) => ParserFixtureResult;
}

interface ParserAstWithComments extends ESTree.Program {
  comments?: Array<
    ReturnType<
      import("eslint").Rule.RuleContext["sourceCode"]["getAllComments"]
    >[number]
  >;
}

function getFirstFunctionBodyStatement(code: string) {
  const program = (parser as unknown as ParserFixtureAdapter).parseForESLint(
    `async function demo(): Promise<void> {\n${code}\n}`,
    {
      loc: true,
      range: true,
      sourceType: "module",
    },
  ).ast;
  const declaration = program.body[0];
  if (
    declaration?.type !== "FunctionDeclaration" ||
    declaration.body.body[0] === void 0
  ) {
    throw new TypeError("Expected a function body statement.");
  }

  return declaration.body.body[0];
}

function parseProgram(code: string): ParserAstWithComments {
  return (parser as unknown as ParserFixtureAdapter).parseForESLint(code, {
    loc: true,
    range: true,
    sourceType: "module",
  }).ast as ParserAstWithComments;
}

describe("AAA analyzer helpers", () => {
  it("parses strict AAA section comments and combined markers", () => {
    // Arrange

    // Act
    const phases = {
      empty: getSectionPhases(""),
      arrange: getSectionPhases("Arrange"),
      arrangeAct: getSectionPhases("Arrange & Act"),
      lowercaseArrange: getSectionPhases("arrange"),
      cleanup: getSectionPhases("Arrange & cleanup"),
    };

    // Assert
    expect(phases.empty).toStrictEqual([]);
    expect(phases.arrange).toStrictEqual(["Arrange"]);
    expect(phases.arrangeAct).toStrictEqual(["Arrange", "Act"]);
    expect(phases.lowercaseArrange).toStrictEqual([]);
    expect(phases.cleanup).toStrictEqual([]);
  });

  it("tracks the canonical AAA order", () => {
    // Arrange

    // Act
    const ordering = {
      arrangeBeforeAct: aaaPhaseOrder.Arrange < aaaPhaseOrder.Act,
      actBeforeAssert: aaaPhaseOrder.Act < aaaPhaseOrder.Assert,
    };

    // Assert
    expect(ordering.arrangeBeforeAct).toBe(true);
    expect(ordering.actBeforeAssert).toBe(true);
  });

  it("preserves combined AAA phases for statements", () => {
    // Arrange
    const sourceText = [
      'it("tracks combined sections", () => {',
      "  // Arrange & Act & Assert",
      "  expect(run()).toBe(1);",
      "});",
    ].join("\n");
    const program = parseProgram(sourceText);
    const callExpression = (program.body[0] as ESTree.ExpressionStatement)
      .expression as ESTree.CallExpression;

    // Act
    const analysis = analyzeTestBlock(
      {
        sourceCode: {
          ast: program,
          getAllComments: () => program.comments ?? [],
          text: sourceText,
        },
      } as never,
      callExpression,
    );

    // Assert
    expect(analysis?.statements[0]?.phases).toStrictEqual([
      "Arrange",
      "Act",
      "Assert",
    ]);
    expect(countActStatements(analysis!)).toBe(1);
  });

  it("detects blank lines before section comments", () => {
    // Arrange
    const sourceText = [
      "it('x', () => {",
      "  const x = 1;",
      "",
      "  // Act",
      "});",
    ].join("\n");

    // Act & Assert
    expect(
      hasBlankLineBeforeComment(sourceText, {
        loc: {
          end: { column: 9, line: 4 },
          start: { column: 2, line: 4 },
        },
        range: [31, 37],
        type: "Line",
        value: " Act",
      }),
    ).toBe(true);
  });

  it("covers line helpers and unsupported assertion operand shapes", () => {
    // Arrange
    const lineStartRange = getLineStartRange("line", 4);

    // Act
    const indentation = getIndentationAtOffset("value", 3);

    // Assert
    expect(lineStartRange).toStrictEqual([4, 4]);
    expect(indentation).toBe("");
    expect(
      getAssertionIdentifiers(
        getFirstFunctionBodyStatement(
          "assert(actualValue).equal(expectedValue);",
        ),
      ),
    ).toStrictEqual({ actual: void 0, expected: void 0 });
  });

  it("checks actual and expected prefixes", () => {
    // Arrange

    // Act
    const prefixes = {
      actual: usesPrefix("actualResult", "actual"),
      expected: usesPrefix("expectedValue", "expected"),
      missing: usesPrefix("result", "actual"),
    };

    // Assert
    expect(prefixes.actual).toBe(true);
    expect(prefixes.expected).toBe(true);
    expect(prefixes.missing).toBe(false);
  });

  it("extracts assertion identifiers for expect and assert calls", () => {
    // Arrange

    // Act
    const identifiers = {
      expectCall: getAssertionIdentifiers(
        getFirstFunctionBodyStatement(
          "expect(actualResult).toBe(expectedValue);",
        ),
      ),
      assertCall: getAssertionIdentifiers(
        getFirstFunctionBodyStatement(
          "assert.equal(actualValue, expectedValue);",
        ),
      ),
      spreadActual: getAssertionIdentifiers(
        getFirstFunctionBodyStatement("assert.equal(...values);"),
      ),
      spreadExpected: getAssertionIdentifiers(
        getFirstFunctionBodyStatement("assert.equal(actualValue, ...values);"),
      ),
      expectSpreadActual: getAssertionIdentifiers(
        getFirstFunctionBodyStatement("expect(...values).toBe(expectedValue);"),
      ),
      expectSpreadExpected: getAssertionIdentifiers(
        getFirstFunctionBodyStatement("expect(actualValue).toBe(...values);"),
      ),
      memberExpectation: getAssertionIdentifiers(
        getFirstFunctionBodyStatement(
          "service.expectation().toBe(expectedValue);",
        ),
      ),
      declaration: getAssertionIdentifiers(
        getFirstFunctionBodyStatement("const actualValue = 1;"),
      ),
      expression: getAssertionIdentifiers(
        getFirstFunctionBodyStatement("actualValue;"),
      ),
    };

    // Assert
    expect(identifiers.expectCall).toStrictEqual({
      actual: "actualResult",
      expected: "expectedValue",
    });
    expect(identifiers.assertCall).toStrictEqual({
      actual: "actualValue",
      expected: "expectedValue",
    });
    expect(identifiers.spreadActual).toStrictEqual({
      actual: void 0,
      expected: void 0,
    });
    expect(identifiers.spreadExpected).toStrictEqual({
      actual: void 0,
      expected: void 0,
    });
    expect(identifiers.expectSpreadActual).toStrictEqual({
      actual: void 0,
      expected: "expectedValue",
    });
    expect(identifiers.expectSpreadExpected).toStrictEqual({
      actual: "actualValue",
      expected: void 0,
    });
    expect(identifiers.memberExpectation).toStrictEqual({
      actual: void 0,
      expected: void 0,
    });
    expect(identifiers.declaration).toStrictEqual({
      actual: void 0,
      expected: void 0,
    });
    expect(identifiers.expression).toStrictEqual({
      actual: void 0,
      expected: void 0,
    });
  });

  it("classifies action, setup, and assertion statements", () => {
    // Arrange
    const actionStatement = getFirstFunctionBodyStatement(
      "const actualResult = run(input);",
    );
    const setupStatement = getFirstFunctionBodyStatement(
      "const fixture = createFixture();",
    );
    const uninitializedSetupStatement =
      getFirstFunctionBodyStatement("let fixture;");
    const assertionStatement = getFirstFunctionBodyStatement(
      "expect(result).toBe(expectedValue);",
    );

    // Act
    const result = {
      actionStatement: isMeaningfulActStatement(actionStatement),
      setupStatement: isSetupLikeStatement(setupStatement),
      uninitializedSetupStatement: isSetupLikeStatement(
        uninitializedSetupStatement,
      ),
      assertionStatement: isMeaningfulActStatement(assertionStatement),
      validAssertionStatement: isValidAssertStatement(assertionStatement),
      validActionStatement: isValidAssertStatement(actionStatement),
      validUninitializedActual: isValidAssertStatement(
        getFirstFunctionBodyStatement("let actualResult;"),
      ),
    };

    // Assert
    expect(result.actionStatement).toBe(true);
    expect(result.setupStatement).toBe(true);
    expect(result.uninitializedSetupStatement).toBe(true);
    expect(result.assertionStatement).toBe(false);
    expect(result.validAssertionStatement).toBe(true);
    expect(result.validActionStatement).toBe(false);
    expect(result.validUninitializedActual).toBe(true);
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
      sourceCodeSetup: isSetupLikeStatement(sourceCodeSetup),
      eslintSetup: isSetupLikeStatement(eslintSetup),
      ruleListenerSetup: isSetupLikeStatement(ruleListenerSetup),
    };

    // Assert
    expect(result.sourceCodeSetup).toBe(true);
    expect(result.eslintSetup).toBe(true);
    expect(result.ruleListenerSetup).toBe(false);
  });

  it("detects async logic, await usage, and capturable act results", () => {
    // Arrange

    // Act
    const result = {
      asyncThen: hasAsyncLogic(
        getFirstFunctionBodyStatement("task.then(handleResult);"),
      ),
      asyncPromise: hasAsyncLogic(
        getFirstFunctionBodyStatement(
          "const deferred = new Promise((resolve) => resolve(void 0));",
        ),
      ),
      awaitCall: hasAwait(getFirstFunctionBodyStatement("await run(input);")),
      capturableRun: hasCapturableActResult(
        getFirstFunctionBodyStatement("run(input);"),
      ),
      capturableSetter: hasCapturableActResult(
        getFirstFunctionBodyStatement("setValue(input);"),
      ),
      capturableValue: hasCapturableActResult(
        getFirstFunctionBodyStatement("value;"),
      ),
    };

    // Assert
    expect(result.asyncThen).toBe(true);
    expect(result.asyncPromise).toBe(true);
    expect(result.awaitCall).toBe(true);
    expect(result.capturableRun).toBe(true);
    expect(result.capturableSetter).toBe(false);
    expect(result.capturableValue).toBe(false);
  });

  it("detects mutations and safely ignores parent cycles", () => {
    // Arrange
    const mutationStatement =
      getFirstFunctionBodyStatement("items.push(value);");
    const nonMutationUnaryStatement = getFirstFunctionBodyStatement("!ready;");
    const assertionStatement = getFirstFunctionBodyStatement(
      "expect(result).toBe(expectedValue);",
    ) as Extract<typeof mutationStatement, { type: "ExpressionStatement" }> & {
      duplicate?: object;
      parent?: object;
    };

    assertionStatement.duplicate = assertionStatement.expression;
    assertionStatement.parent = assertionStatement;

    // Act
    const result = {
      mutationStatement: hasMutation(mutationStatement),
      nonMutationUnaryStatement: hasMutation(nonMutationUnaryStatement),
      assertionStatement: hasAssertion(assertionStatement),
      blankLineBeforeComment: hasBlankLineBeforeComment("// Arrange", {
        type: "Line",
        value: " Arrange",
      } as never),
    };

    // Assert
    expect(result.mutationStatement).toBe(true);
    expect(result.nonMutationUnaryStatement).toBe(false);
    expect(result.assertionStatement).toBe(true);
    expect(result.blankLineBeforeComment).toBe(true);
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
    const program = parseProgram(sourceText);
    const callExpression = (program.body[0] as ESTree.ExpressionStatement)
      .expression as ESTree.CallExpression;

    // Act
    const analysis = analyzeTestBlock(
      {
        sourceCode: {
          ast: program,
          getAllComments: () => program.comments ?? [],
          text: sourceText,
        },
      } as never,
      callExpression,
    );

    // Assert
    expect(analysis?.newline).toBe("\n");
    expect(analysis?.sectionComments).toHaveLength(3);
    expect([...getAssertDeclaredIdentifiers(analysis!).keys()]).toStrictEqual(
      [],
    );
    expect(countActStatements(analysis!)).toBe(1);
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
    const program = parseProgram(sourceText);
    const callExpression = (program.body[0] as ESTree.ExpressionStatement)
      .expression as ESTree.CallExpression;
    const callback = callExpression
      .arguments[1] as ESTree.ArrowFunctionExpression;
    const firstStatement =
      callback.body.type === "BlockStatement" ? callback.body.body[0] : void 0;

    // Act
    const analysis = (() => {
      if (firstStatement === void 0) {
        throw new TypeError("Expected a function body statement.");
      }

      (
        firstStatement as ESTree.Statement & {
          loc?: ESTree.SourceLocation | null;
        }
      ).loc = null;

      return analyzeTestBlock(
        {
          sourceCode: {
            ast: program,
            getAllComments: () => program.comments ?? [],
            text: sourceText,
          },
        } as never,
        callExpression,
      );
    })();

    // Assert
    expect(analysis?.newline).toBe("\r\n");
    expect(analysis?.statements[0]?.phase).toBeUndefined();
    expect(analysis?.statements[0]?.phases).toStrictEqual([]);
  });

  it("covers computed calls, chained calls, and unsupported phase analysis", () => {
    // Arrange
    const helperSourceText = "helper();";
    const helperProgram = parseProgram(helperSourceText);
    const helperCallExpression = (
      helperProgram.body[0] as ESTree.ExpressionStatement
    ).expression as ESTree.CallExpression;
    const todoSourceText = 'it("todo");';
    const todoProgram = parseProgram(todoSourceText);
    const todoCallExpression = (
      todoProgram.body[0] as ESTree.ExpressionStatement
    ).expression as ESTree.CallExpression;

    // Act
    const result = {
      valueSetup: isSetupLikeStatement(getFirstFunctionBodyStatement("value;")),
      dependencySetup: isSetupLikeStatement(
        getFirstFunctionBodyStatement("dependencies[key]();"),
      ),
      optionalCall: hasCapturableActResult(
        getFirstFunctionBodyStatement("dependencies?.run?.(input);"),
      ),
      computedCall: hasCapturableActResult(
        getFirstFunctionBodyStatement("dependencies[key](input);"),
      ),
      stringComputedCall: hasCapturableActResult(
        getFirstFunctionBodyStatement('dependencies["run"](input);'),
      ),
      helperAnalysis: analyzeTestBlock(
        {
          sourceCode: {
            ast: helperProgram,
            getAllComments: () => [],
            text: helperSourceText,
          },
        } as never,
        helperCallExpression,
      ),
      todoAnalysis: analyzeTestBlock(
        {
          sourceCode: {
            ast: todoProgram,
            getAllComments: () => [],
            text: todoSourceText,
          },
        } as never,
        todoCallExpression,
      ),
    };

    // Assert
    expect(result.valueSetup).toBe(false);
    expect(result.dependencySetup).toBe(false);
    expect(result.optionalCall).toBe(true);
    expect(result.computedCall).toBe(true);
    expect(result.stringComputedCall).toBe(true);
    expect(result.helperAnalysis).toBeUndefined();
    expect(result.todoAnalysis).toBeUndefined();
  });

  it("treats non-expression and multi-declaration statements as non-actions", () => {
    // Arrange

    // Act
    const result = {
      conditionalAction: isMeaningfulActStatement(
        getFirstFunctionBodyStatement("if (ready) { run(); }"),
      ),
      multiDeclarationAction: isMeaningfulActStatement(
        getFirstFunctionBodyStatement(
          "const actualResult = run(), nextResult = run();",
        ),
      ),
    };

    // Assert
    expect(result.multiDeclarationAction).toBe(false);
    expect(result.conditionalAction).toBe(false);
  });

  it("handles super member expressions as unnamed invocations", () => {
    // Arrange
    const program = parseProgram(
      [
        "class Child extends Base {",
        "  demo() {",
        "    super.run();",
        "  }",
        "}",
      ].join("\n"),
    );
    const classDeclaration = program.body[0] as ESTree.ClassDeclaration;

    // Act
    const method = (() => {
      const methodValue = classDeclaration.body.body[0];

      if (
        methodValue?.type !== "MethodDefinition" ||
        methodValue.value.body?.body[0] === void 0
      ) {
        throw new TypeError("Expected a class method statement.");
      }

      return methodValue;
    })();

    // Assert
    expect(hasCapturableActResult(method.value.body.body[0]!)).toBe(true);
  });

  it("treats constructor super calls as capturable actions", () => {
    // Arrange
    const program = parseProgram(
      [
        "class Child extends Base {",
        "  constructor() {",
        "    super();",
        "  }",
        "}",
      ].join("\n"),
    );
    const classDeclaration = program.body[0] as ESTree.ClassDeclaration;

    // Act
    const constructor = (() => {
      const constructorValue = classDeclaration.body.body[0];

      if (
        constructorValue?.type !== "MethodDefinition" ||
        constructorValue.value.body?.body[0] === void 0
      ) {
        throw new TypeError("Expected a constructor statement.");
      }

      return constructorValue;
    })();

    // Assert
    expect(hasCapturableActResult(constructor.value.body.body[0]!)).toBe(true);
  });

  it("covers assert member calls and non-assert member calls", () => {
    // Arrange

    // Act
    const result = {
      assertMemberCall: hasAssertion(
        getFirstFunctionBodyStatement("assert.equal(actual, expected);"),
      ),
      nonAssertMemberCall: hasAssertion(
        getFirstFunctionBodyStatement("service.execute(actual);"),
      ),
      setupLikeComputedDependency: isSetupLikeStatement(
        getFirstFunctionBodyStatement("dependencies[key]();"),
      ),
      indirectFactoryCall: hasAssertion(
        getFirstFunctionBodyStatement("(factory())();"),
      ),
    };

    // Assert
    expect(result.assertMemberCall).toBe(true);
    expect(result.nonAssertMemberCall).toBe(false);
    expect(result.setupLikeComputedDependency).toBe(false);
    expect(result.indirectFactoryCall).toBe(false);
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
    const program = parseProgram(sourceText);
    const callExpression = (program.body[0] as ESTree.ExpressionStatement)
      .expression as ESTree.CallExpression;

    // Act
    const analysis = analyzeTestBlock(
      {
        sourceCode: {
          ast: program,
          getAllComments: () => program.comments ?? [],
          text: sourceText,
        },
      } as never,
      callExpression,
    );

    // Assert
    expect([...getAssertDeclaredIdentifiers(analysis!).keys()]).toStrictEqual([
      "actualResult",
      "expectedValue",
    ]);
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
    const program = parseProgram(sourceText);
    const callExpression = (program.body[0] as ESTree.ExpressionStatement)
      .expression as ESTree.CallExpression;

    // Act
    const analysis = analyzeTestBlock(
      {
        sourceCode: {
          ast: program,
          getAllComments: () => program.comments ?? [],
          text: sourceText,
        },
      } as never,
      callExpression,
    );

    // Assert
    expect([...getAssertDeclaredIdentifiers(analysis!).keys()]).toStrictEqual(
      [],
    );
  });
});
