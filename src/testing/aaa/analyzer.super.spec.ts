import type * as ESTree from "estree";

import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import { hasCapturableActResult } from "./analyzer";

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
 * @param code Input code value.
 * @returns Return value output.
 * @example
 * ```typescript
 * parseProgram("class Example {}");
 * ```
 */
const parseProgram = (code: string): ESTree.Program =>
  (parser as unknown as ParserFixtureAdapter).parseForESLint(code, {
    loc: true,
    range: true,
    sourceType: "module",
  }).ast;

/**
 * Gets the first class-method statement from a fixture.
 * @param code Input code value.
 * @returns Return value output.
 * @throws {TypeError} Thrown when the fixture does not contain a class method statement.
 * @example
 * ```typescript
 * getFirstClassMethodStatement("class Example { demo() {} }");
 * ```
 */
const getFirstClassMethodStatement = (code: string): ESTree.Statement => {
  const [declaration] = parseProgram(code).body;
  const member =
    declaration?.type === "ClassDeclaration"
      ? declaration.body.body[0]
      : void 0;
  const statement =
    member?.type === "MethodDefinition" ? member.value.body.body[0] : void 0;
  if (statement === void 0) {
    throw new TypeError("Expected a class method statement.");
  }

  return statement;
};

describe("aAA analyzer super handling", () => {
  it("handles super member expressions as unnamed invocations", () => {
    // Arrange
    const statement = getFirstClassMethodStatement(
      [
        "class Child extends Base {",
        "  demo() {",
        "    super.run();",
        "  }",
        "}",
      ].join("\n"),
    );

    // Act
    const result = hasCapturableActResult(statement);

    // Assert
    expect(result).toBe(true);
  });

  it("treats constructor super calls as capturable actions", () => {
    // Arrange
    const statement = getFirstClassMethodStatement(
      [
        "class Child extends Base {",
        "  constructor() {",
        "    super();",
        "  }",
        "}",
      ].join("\n"),
    );

    // Act
    const result = hasCapturableActResult(statement);

    // Assert
    expect(result).toBe(true);
  });
});
