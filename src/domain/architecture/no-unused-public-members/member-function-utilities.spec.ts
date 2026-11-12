import * as ts from "typescript";
import { describe, expect, it } from "vitest";

import { getFunctionFacts, hasFunctionBody } from "./member-function-utilities";

const createFunctionFixture = () => {
  const source = ts.createSourceFile(
    "function-facts.ts",
    [
      "function outer(value: unknown): object {",
      "  function nested(): unknown { other(value); return value; }",
      "  JSON.stringify(value);",
      "  return {};",
      "}",
      "const concise = (): object => ({});",
    ].join("\n"),
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = source.statements.find((statement) =>
    ts.isFunctionDeclaration(statement),
  );
  const variable = source.statements.find((statement) =>
    ts.isVariableStatement(statement),
  );
  const concise = variable?.declarationList.declarations[0]?.initializer;
  if (
    !hasFunctionBody(declaration) ||
    concise === void 0 ||
    !ts.isArrowFunction(concise)
  ) {
    throw new Error("Missing function-facts fixture implementations");
  }
  return { concise, declaration };
};

describe("function syntax summaries", () => {
  it("separates own calls and returns from closures and reuses the same immutable snapshot", () => {
    // Arrange
    const { concise, declaration } = createFunctionFixture();

    // Act
    const [actualFirst, actualRepeated, actualArrow] = [
      getFunctionFacts(declaration),
      getFunctionFacts(declaration),
      getFunctionFacts(concise),
    ] as const;

    // Assert
    expect(actualRepeated).toBe(actualFirst);
    expect(
      actualFirst.calls.map((call) => call.expression.getText()),
    ).toStrictEqual(["JSON.stringify"]);
    expect(actualFirst.allCalls).toHaveLength(2);
    expect(
      actualFirst.allCalls.map((call) => call.expression.getText()),
    ).toEqual(expect.arrayContaining(["JSON.stringify", "other"]));
    expect(
      actualFirst.returns.map((expression) => expression.getText()),
    ).toStrictEqual(["{}"]);
    expect(
      actualArrow.returns.map((expression) => expression.getText()),
    ).toStrictEqual(["({})"]);
  });
});
