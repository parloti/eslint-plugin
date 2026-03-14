import { describe, expect, it } from "vitest";
import { parser } from "typescript-eslint";
import type * as ESTree from "estree";

import {
  aaaPhaseOrder,
  analyzeTestBlock,
  countActStatements,
  getAssertDeclaredIdentifiers,
  getAssertionIdentifiers,
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
    expect(getSectionPhases("")).toStrictEqual([]);
    expect(getSectionPhases("Arrange")).toStrictEqual(["Arrange"]);
    expect(getSectionPhases("Arrange & Act")).toStrictEqual(["Arrange", "Act"]);
    expect(getSectionPhases("arrange")).toStrictEqual([]);
    expect(getSectionPhases("Arrange & cleanup")).toStrictEqual([]);
  });

  it("tracks the canonical AAA order", () => {
    expect(aaaPhaseOrder.Arrange).toBeLessThan(aaaPhaseOrder.Act);
    expect(aaaPhaseOrder.Act).toBeLessThan(aaaPhaseOrder.Assert);
  });

  it("detects blank lines before section comments", () => {
    const sourceText = [
      "it('x', () => {",
      "  const x = 1;",
      "",
      "  // Act",
      "});",
    ].join("\n");

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

  it("checks actual and expected prefixes", () => {
    expect(usesPrefix("actualResult", "actual")).toBe(true);
    expect(usesPrefix("expectedValue", "expected")).toBe(true);
    expect(usesPrefix("result", "actual")).toBe(false);
  });

  it("extracts assertion identifiers for expect and assert calls", () => {
    expect(
      getAssertionIdentifiers(
        getFirstFunctionBodyStatement(
          "expect(actualResult).toBe(expectedValue);",
        ),
      ),
    ).toStrictEqual({ actual: "actualResult", expected: "expectedValue" });
    expect(
      getAssertionIdentifiers(
        getFirstFunctionBodyStatement(
          "assert.equal(actualValue, expectedValue);",
        ),
      ),
    ).toStrictEqual({ actual: "actualValue", expected: "expectedValue" });
    expect(
      getAssertionIdentifiers(
        getFirstFunctionBodyStatement("assert.equal(...values);"),
      ),
    ).toStrictEqual({ actual: void 0, expected: void 0 });
    expect(
      getAssertionIdentifiers(
        getFirstFunctionBodyStatement("assert.equal(actualValue, ...values);"),
      ),
    ).toStrictEqual({ actual: void 0, expected: void 0 });
    expect(
      getAssertionIdentifiers(
        getFirstFunctionBodyStatement("expect(...values).toBe(expectedValue);"),
      ),
    ).toStrictEqual({ actual: void 0, expected: "expectedValue" });
    expect(
      getAssertionIdentifiers(
        getFirstFunctionBodyStatement("expect(actualValue).toBe(...values);"),
      ),
    ).toStrictEqual({ actual: "actualValue", expected: void 0 });
    expect(
      getAssertionIdentifiers(
        getFirstFunctionBodyStatement(
          "service.expectation().toBe(expectedValue);",
        ),
      ),
    ).toStrictEqual({ actual: void 0, expected: void 0 });
    expect(
      getAssertionIdentifiers(
        getFirstFunctionBodyStatement("const actualValue = 1;"),
      ),
    ).toStrictEqual({ actual: void 0, expected: void 0 });
    expect(
      getAssertionIdentifiers(getFirstFunctionBodyStatement("actualValue;")),
    ).toStrictEqual({ actual: void 0, expected: void 0 });
  });

  it("classifies action, setup, and assertion statements", () => {
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

    expect(isMeaningfulActStatement(actionStatement)).toBe(true);
    expect(isSetupLikeStatement(setupStatement)).toBe(true);
    expect(isSetupLikeStatement(uninitializedSetupStatement)).toBe(true);
    expect(isMeaningfulActStatement(assertionStatement)).toBe(false);
    expect(isValidAssertStatement(assertionStatement)).toBe(true);
    expect(isValidAssertStatement(actionStatement)).toBe(false);
  });

  it("detects async logic, await usage, and capturable act results", () => {
    expect(
      hasAsyncLogic(getFirstFunctionBodyStatement("task.then(handleResult);")),
    ).toBe(true);
    expect(
      hasAsyncLogic(
        getFirstFunctionBodyStatement(
          "const deferred = new Promise((resolve) => resolve(void 0));",
        ),
      ),
    ).toBe(true);
    expect(hasAwait(getFirstFunctionBodyStatement("await run(input);"))).toBe(
      true,
    );
    expect(
      hasCapturableActResult(getFirstFunctionBodyStatement("run(input);")),
    ).toBe(true);
    expect(
      hasCapturableActResult(getFirstFunctionBodyStatement("setValue(input);")),
    ).toBe(false);
    expect(
      hasCapturableActResult(getFirstFunctionBodyStatement("value;")),
    ).toBe(false);
  });

  it("detects mutations and safely ignores parent cycles", () => {
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

    expect(hasMutation(mutationStatement)).toBe(true);
    expect(hasMutation(nonMutationUnaryStatement)).toBe(false);
    expect(hasAssertion(assertionStatement)).toBe(true);
    expect(
      hasBlankLineBeforeComment("// Arrange", {
        type: "Line",
        value: " Arrange",
      } as never),
    ).toBe(true);
  });

  it("analyzes supported test blocks and counts Act statements", () => {
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

    expect(analysis?.newline).toBe("\n");
    expect(analysis?.sectionComments).toHaveLength(3);
    expect([...getAssertDeclaredIdentifiers(analysis!).keys()]).toStrictEqual(
      [],
    );
    expect(countActStatements(analysis!)).toBe(1);
  });

  it("detects CRLF newlines and tolerates statements without location metadata", () => {
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

    if (firstStatement === void 0) {
      throw new TypeError("Expected a function body statement.");
    }

    (
      firstStatement as ESTree.Statement & {
        loc?: ESTree.SourceLocation | null;
      }
    ).loc = null;

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

    expect(analysis?.newline).toBe("\r\n");
    expect(analysis?.statements[0]?.phase).toBeUndefined();
  });

  it("covers computed calls, chained calls, and unsupported phase analysis", () => {
    expect(isSetupLikeStatement(getFirstFunctionBodyStatement("value;"))).toBe(
      false,
    );
    expect(
      isSetupLikeStatement(
        getFirstFunctionBodyStatement("dependencies[key]();"),
      ),
    ).toBe(false);
    expect(
      hasCapturableActResult(
        getFirstFunctionBodyStatement("dependencies?.run?.(input);"),
      ),
    ).toBe(true);
    expect(
      hasCapturableActResult(
        getFirstFunctionBodyStatement("dependencies[key](input);"),
      ),
    ).toBe(true);
    expect(
      hasCapturableActResult(
        getFirstFunctionBodyStatement('dependencies["run"](input);'),
      ),
    ).toBe(true);
    expect(
      analyzeTestBlock(
        {
          sourceCode: {
            ast: parseProgram("helper();"),
            getAllComments: () => [],
            text: "helper();",
          },
        } as never,
        (parseProgram("helper();").body[0] as ESTree.ExpressionStatement)
          .expression as ESTree.CallExpression,
      ),
    ).toBeUndefined();
    expect(
      analyzeTestBlock(
        {
          sourceCode: {
            ast: parseProgram('it("todo");'),
            getAllComments: () => [],
            text: 'it("todo");',
          },
        } as never,
        (parseProgram('it("todo");').body[0] as ESTree.ExpressionStatement)
          .expression as ESTree.CallExpression,
      ),
    ).toBeUndefined();
  });

  it("treats non-expression and multi-declaration statements as non-actions", () => {
    expect(
      isMeaningfulActStatement(
        getFirstFunctionBodyStatement(
          "const actualResult = run(), nextResult = run();",
        ),
      ),
    ).toBe(false);
    expect(
      isMeaningfulActStatement(
        getFirstFunctionBodyStatement("if (ready) { run(); }"),
      ),
    ).toBe(false);
  });

  it("handles super member expressions as unnamed invocations", () => {
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
    const method = classDeclaration.body.body[0];

    if (
      method?.type !== "MethodDefinition" ||
      method.value.body?.body[0] === void 0
    ) {
      throw new TypeError("Expected a class method statement.");
    }

    expect(hasCapturableActResult(method.value.body.body[0])).toBe(true);
  });

  it("covers assert member calls and non-assert member calls", () => {
    expect(
      hasAssertion(
        getFirstFunctionBodyStatement("assert.equal(actual, expected);"),
      ),
    ).toBe(true);
    expect(
      hasAssertion(getFirstFunctionBodyStatement("service.execute(actual);")),
    ).toBe(false);
    expect(
      isSetupLikeStatement(
        getFirstFunctionBodyStatement("dependencies[key]();"),
      ),
    ).toBe(false);
    expect(hasAssertion(getFirstFunctionBodyStatement("(factory())();"))).toBe(
      false,
    );
  });

  it("collects assert-local declared identifiers", () => {
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

    expect([...getAssertDeclaredIdentifiers(analysis!).keys()]).toStrictEqual([
      "actualResult",
      "expectedValue",
    ]);
  });

  it("ignores destructured Assert declarations when collecting identifiers", () => {
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

    expect([...getAssertDeclaredIdentifiers(analysis!).keys()]).toStrictEqual(
      [],
    );
  });
});
