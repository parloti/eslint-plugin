import type * as ESTree from "estree";

import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import {
  aaaPhaseOrder,
  getAssertionIdentifiers,
  getIndentationAtOffset,
  getLineStartRange,
  getSectionPhases,
  hasBlankLineBeforeComment,
  usesPrefix,
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
 * parseProgram("const value = 1;");
 * ```
 */
const parseProgram = (code: string): ESTree.Program =>
  (parser as unknown as ParserFixtureAdapter).parseForESLint(code, {
    loc: true,
    range: true,
    sourceType: "module",
  }).ast;

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

describe("aAA analyzer helpers", () => {
  it("parses strict AAA section comments and combined markers", () => {
    // Arrange
    const expectedEmpty: [] = [];

    // Act
    const phases = {
      arrange: getSectionPhases("Arrange"),
      arrangeAct: getSectionPhases("Arrange & Act"),
      cleanup: getSectionPhases("Arrange & cleanup"),
      empty: getSectionPhases(""),
      lowercaseArrange: getSectionPhases("arrange"),
    };

    // Assert
    expect(phases.empty).toStrictEqual(expectedEmpty);
    expect(phases.arrange).toStrictEqual(["Arrange"]);
    expect(phases.arrangeAct).toStrictEqual(["Arrange", "Act"]);
    expect(phases.lowercaseArrange).toStrictEqual([]);
    expect(phases.cleanup).toStrictEqual([]);
  });

  it("tracks the canonical AAA order", () => {
    // Arrange
    const expectedOrdering = { Act: 1, Arrange: 0, Assert: 2 };

    // Act
    const ordering = aaaPhaseOrder;

    // Assert
    expect(ordering).toStrictEqual(expectedOrdering);
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

    // Act
    const actual = hasBlankLineBeforeComment(sourceText, {
      loc: {
        end: { column: 9, line: 4 },
        start: { column: 2, line: 4 },
      },
      range: [31, 37],
      type: "Line",
      value: " Act",
    });

    // Assert
    expect(actual).toBe(true);
  });

  it("treats comments without location data as already separated", () => {
    // Arrange
    const expected = true;

    // Act
    const result = hasBlankLineBeforeComment("// Arrange", {
      type: "Line",
      value: " Arrange",
    } as never);

    // Assert
    expect(result).toBe(expected);
  });

  it("covers line helpers and unsupported assertion operand shapes", () => {
    // Arrange
    const lineStartRange = getLineStartRange("line", 4);

    // Act
    const result = {
      assertionIdentifiers: getAssertionIdentifiers(
        getFirstFunctionBodyStatement(
          "assert(actualValue).equal(expectedValue);",
        ),
      ),
      indentation: getIndentationAtOffset("value", 3),
    };

    // Assert
    expect(lineStartRange).toStrictEqual([4, 4]);
    expect(result.indentation).toBe("");
    expect(result.assertionIdentifiers).toStrictEqual({
      actual: void 0,
      expected: void 0,
    });
  });

  it("checks actual and expected prefixes", () => {
    // Arrange
    const expectedMissing = false;

    // Act
    const prefixes = {
      actual: usesPrefix("actualResult", "actual"),
      expected: usesPrefix("expectedValue", "expected"),
      missing: usesPrefix("result", "actual"),
    };

    // Assert
    expect(prefixes.actual).toBe(true);
    expect(prefixes.expected).toBe(true);
    expect(prefixes.missing).toBe(expectedMissing);
  });
});
