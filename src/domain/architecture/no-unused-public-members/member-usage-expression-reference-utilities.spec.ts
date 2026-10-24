import * as ts from "typescript";
import { describe, expect, it } from "vitest";

import { expressionReferencesSymbol } from "./member-usage-expression-reference-utilities";

const findNode = <T extends ts.Node>(
  sourceFile: ts.SourceFile,
  predicate: (node: ts.Node) => node is T,
): T | undefined => {
  let found: T | undefined;
  const visit = (node: ts.Node): void => {
    if (found !== undefined) {
      return;
    }
    if (predicate(node)) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
};

const createSymbol = (
  name: string,
  valueDeclaration?: ts.Declaration,
): ts.Symbol =>
  ({
    flags: ts.SymbolFlags.BlockScopedVariable,
    name,
    ...(valueDeclaration !== undefined && { valueDeclaration }),
  }) as unknown as ts.Symbol;

const createExpressionReferenceFixture = () => {
  const sourceFile = ts.createSourceFile(
    "fixture.ts",
    [
      "const target = {};",
      "const alias = target;",
      "const { value: renamed } = target;",
      "function consume(_value: unknown): void {}",
      "consume(target as object);",
      "consume(target!);",
      "consume((target));",
      "consume(target satisfies object);",
      "consume(<object>target);",
      "consume(target.value);",
      "consume(target['value']);",
      "consume(wrap(target));",
      "consume(flag ? {} : target);",
      "consume({ ...target });",
      "consume({ value: target });",
      "consume({ target });",
      "consume([target]);",
      "consume(alias);",
      "consume(renamed);",
      "consume(missing);",
      "function destructured({ value: parameter }: object): void { consume(parameter); }",
    ].join("\n"),
    ts.ScriptTarget.Latest,
    true,
  );
  const declarations: ts.VariableDeclaration[] = [];
  const bindingElements: ts.BindingElement[] = [];
  const collectDeclarations = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node)) {
      declarations.push(node);
    } else if (ts.isBindingElement(node)) {
      bindingElements.push(node);
    }
    ts.forEachChild(node, collectDeclarations);
  };
  collectDeclarations(sourceFile);

  const aliasDeclaration = declarations.find(
    ({ name }) => ts.isIdentifier(name) && name.text === "alias",
  );
  const renamedDeclaration = bindingElements.find(
    ({ name }) => ts.isIdentifier(name) && name.text === "renamed",
  );
  const parameterDeclaration = bindingElements.find(
    ({ name }) => ts.isIdentifier(name) && name.text === "parameter",
  );
  const targetSymbol = createSymbol("target");
  const symbols = new Map([
    ["alias", createSymbol("alias", aliasDeclaration)],
    ["parameter", createSymbol("parameter", parameterDeclaration)],
    ["renamed", createSymbol("renamed", renamedDeclaration)],
    ["target", targetSymbol],
  ]);
  const checker = {
    getShorthandAssignmentValueSymbol: () => targetSymbol,
    getSymbolAtLocation: (node: ts.Node) =>
      ts.isIdentifier(node) ? symbols.get(node.text) : undefined,
  } as unknown as ts.TypeChecker;
  const argumentsToInspect: ts.Expression[] = [];
  const collectCallArguments = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "consume"
    ) {
      const [argument] = node.arguments;
      if (argument !== undefined) {
        argumentsToInspect.push(argument);
      }
    }
    ts.forEachChild(node, collectCallArguments);
  };
  collectCallArguments(sourceFile);
  const targetExpression = findNode(
    sourceFile,
    (node): node is ts.Identifier =>
      ts.isIdentifier(node) && node.text === "target",
  );

  if (targetExpression === undefined) {
    throw new Error("Expected the fixture target identifier to exist.");
  }

  return { argumentsToInspect, checker, targetExpression, targetSymbol };
};

describe("member expression reference tracing", () => {
  it("follows identifiers, wrappers, destructuring, containers, and value flow", () => {
    // Arrange
    const { argumentsToInspect, checker, targetSymbol } =
      createExpressionReferenceFixture();

    // Act
    const actualReferences = argumentsToInspect.map((expression) =>
      expressionReferencesSymbol(expression, targetSymbol, checker),
    );

    // Assert
    expect(actualReferences).toStrictEqual([
      ...Array.from({ length: 15 }, () => true),
      false,
      false,
    ]);
  });

  it("stops traversing an expression that is already in the visited set", () => {
    // Arrange
    const { checker, targetExpression, targetSymbol } =
      createExpressionReferenceFixture();
    const visitedExpressions = new Set([targetExpression]);

    // Act
    const actualReferences = expressionReferencesSymbol(
      targetExpression,
      targetSymbol,
      checker,
      visitedExpressions,
    );

    // Assert
    expect(actualReferences).toBe(false);
  });
});
