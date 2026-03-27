import type { Rule } from "eslint";
import type * as ESTree from "estree";

import type {
  AaaPhase,
  LocatedComment,
  LocatedNode,
  SourceComment,
  TestBlockAnalysis,
} from "./types";

/**
 *
 */
const aaaPhaseOrder = {
  Act: 1,
  Arrange: 0,
  Assert: 2,
} as const satisfies Record<AaaPhase, number>;

/**
 *
 */
const arrayMutationMethods = new Set([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift",
]);

/**
 *
 */
const phaseNames = ["Arrange", "Act", "Assert"] as const satisfies readonly [
  AaaPhase,
  AaaPhase,
  AaaPhase,
];

/**
 *
 */
const setupLikeNames =
  /^(arrange|build|create|fixture|get|given|make|mock|parse|seed|setup|spy|stub|write)/u;

/**
 *
 */
const utilityMethodNames = new Set([
  "advanceTimersByTime",
  "clearAllMocks",
  "debug",
  "fn",
  "info",
  "join",
  "log",
  "mockImplementation",
  "mockRejectedValue",
  "mockResolvedValue",
  "mockReturnValue",
  "push",
  "resetAllMocks",
  "resolve",
  "useFakeTimers",
  "warn",
]);

/**
 *
 */
const voidLikeMethodNames = new Set([
  "clear",
  "debug",
  "dispatch",
  "emit",
  "info",
  "log",
  "print",
  "publish",
  "reset",
  "set",
  "trigger",
  "warn",
]);

/**
 *
 */
interface AssertionIdentifiers {
  /**
   *
   */
  actual: string | undefined;

  /**
   *
   */
  expected: string | undefined;
}

/**
 * @param context
 * @param node
 * @example
 */
function analyzeTestBlock(
  context: Rule.RuleContext,
  node: ESTree.CallExpression,
): TestBlockAnalysis | undefined {
  const testCall = getSupportedTestCall(node);
  if (testCall === void 0) {
    return void 0;
  }

  const { callback, callExpression } = testCall;
  const { sourceCode } = context;
  const sectionComments: TestBlockAnalysis["sectionComments"] = sourceCode
    .getAllComments()
    .filter(
      (comment) =>
        isLocatedComment(comment) &&
        comment.type === "Line" &&
        isRangeWithin(comment.range, callback.body.range) &&
        getSectionPhases(comment.value).length > 0,
    )
    .map((comment) => ({
      comment: comment as LocatedComment,
      phases: getSectionPhases(comment.value),
    }));
  return {
    body: callback.body,
    bodyLineCount:
      callback.body.loc.end.line - callback.body.loc.start.line - 1,
    callExpression,
    newline: getNewline(sourceCode.text),
    sectionComments,
    sourceText: sourceCode.text,
    statements: callback.body.body.map((statement) => {
      const phases = getStatementPhases(statement, sectionComments);

      return {
        node: statement as LocatedNode<ESTree.Statement>,
        phase: phases.at(-1),
        phases,
      };
    }),
  };
}

/**
 * @param analysis
 * @example
 */
function countActStatements(analysis: TestBlockAnalysis): number {
  return analysis.statements.filter(
    (statement) =>
      statement.phases.includes("Act") &&
      (statement.node.type === "ExpressionStatement" ||
        statement.node.type === "VariableDeclaration"),
  ).length;
}

/**
 * @param analysis
 * @example
 */
function getAssertDeclaredIdentifiers(
  analysis: TestBlockAnalysis,
): Map<string, LocatedNode<ESTree.Identifier>> {
  const declaredIdentifiers = new Map<string, LocatedNode<ESTree.Identifier>>();

  for (const statement of analysis.statements) {
    if (
      !statement.phases.includes("Assert") ||
      statement.node.type !== "VariableDeclaration"
    ) {
      continue;
    }

    for (const declaration of statement.node.declarations) {
      if (declaration.id.type === "Identifier") {
        declaredIdentifiers.set(
          declaration.id.name,
          declaration.id as LocatedNode<ESTree.Identifier>,
        );
      }
    }
  }

  return declaredIdentifiers;
}

/**
 * @param statement
 * @example
 */
function getAssertionIdentifiers(
  statement: ESTree.Statement,
): AssertionIdentifiers {
  if (statement.type !== "ExpressionStatement") {
    return { actual: void 0, expected: void 0 };
  }

  const expression = unwrapExpression(statement.expression);
  if (expression?.type !== "CallExpression") {
    return { actual: void 0, expected: void 0 };
  }

  const expectOperands = getExpectOperands(expression);
  if (expectOperands !== void 0) {
    return {
      actual: getIdentifierName(expectOperands.actual),
      expected: getIdentifierName(expectOperands.expected),
    };
  }

  const assertOperands = getAssertOperands(expression);
  return {
    actual: getIdentifierName(assertOperands?.actual),
    expected: getIdentifierName(assertOperands?.expected),
  };
}

/**
 * @param expression
 * @example
 */
function getAssertOperands(expression: ESTree.CallExpression):
  | undefined
  | {
      /**
       *
       */
      actual: ESTree.Expression | undefined;

      /**
       *
       */
      expected: ESTree.Expression | undefined;
    } {
  if (
    expression.callee.type === "MemberExpression" &&
    expression.callee.object.type === "Identifier" &&
    expression.callee.object.name === "assert"
  ) {
    const [actual, expected] = expression.arguments;
    if (
      actual?.type !== "SpreadElement" &&
      expected?.type !== "SpreadElement"
    ) {
      return { actual, expected };
    }
  }

  return void 0;
}

/**
 * @param expression
 * @example
 */
function getExpectOperands(expression: ESTree.CallExpression):
  | undefined
  | {
      /**
       *
       */
      actual: ESTree.Expression | undefined;

      /**
       *
       */
      expected: ESTree.Expression | undefined;
    } {
  if (
    expression.callee.type === "Identifier" &&
    expression.callee.name === "expect"
  ) {
    const [actual] = expression.arguments;
    return actual?.type === "SpreadElement"
      ? { actual: void 0, expected: void 0 }
      : { actual, expected: void 0 };
  }

  if (
    expression.callee.type === "MemberExpression" &&
    expression.callee.object.type === "CallExpression"
  ) {
    const nestedOperands = getExpectOperands(expression.callee.object);
    if (nestedOperands === void 0) {
      return void 0;
    }

    const [expected] = expression.arguments;
    return expected?.type === "SpreadElement"
      ? nestedOperands
      : { actual: nestedOperands.actual, expected };
  }

  return void 0;
}

/**
 * @param expression
 * @example
 */
function getExpressionName(
  expression: ESTree.Expression | ESTree.PrivateIdentifier | ESTree.Super,
): string | undefined {
  if (expression.type === "Super") {
    return void 0;
  }

  if (expression.type === "Identifier") {
    return expression.name;
  }

  if (
    expression.type === "MemberExpression" &&
    expression.property.type === "Identifier"
  ) {
    return expression.property.name;
  }

  return void 0;
}

/**
 * @param analysis
 * @example
 */
function getFlattenedSections(
  analysis: Pick<TestBlockAnalysis, "sectionComments">,
): {
  /**
   *
   */
  comment: SourceComment; /**
   *
   */
  phase: AaaPhase;
}[] {
  return analysis.sectionComments.flatMap((sectionComment) =>
    sectionComment.phases.map((phase) => ({
      comment: sectionComment.comment,
      phase,
    })),
  );
}

/**
 * @param expression
 * @example
 */
function getIdentifierName(
  expression: ESTree.Expression | undefined,
): string | undefined {
  return expression?.type === "Identifier" ? expression.name : void 0;
}

/**
 * @param sourceText
 * @param offset
 * @example
 */
function getIndentationAtOffset(sourceText: string, offset: number): string {
  const lineStart = sourceText.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const linePrefix = sourceText.slice(lineStart, offset);
  const indentation = /^\s*/u.exec(linePrefix);
  return indentation![0];
}

/**
 * @param expression
 * @example
 */
function getInvokedName(
  expression: ESTree.CallExpression | ESTree.NewExpression,
): string | undefined {
  return getExpressionName(expression.callee);
}

/**
 * @param sourceText
 * @param line
 * @example
 */
function getLineStartRange(sourceText: string, line: number): [number, number] {
  let currentLine = 1;

  for (let index = 0; index < sourceText.length; index += 1) {
    if (currentLine === line) {
      return [index, index];
    }

    if (sourceText[index] === "\n") {
      currentLine += 1;
    }
  }
  return [sourceText.length, sourceText.length];
}

/**
 * @param text
 * @example
 */
function getNewline(text: string): "\n" | "\r\n" {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * @param analysis
 * @example
 */
function getPhaseBoundaryComments(
  analysis: Pick<TestBlockAnalysis, "sectionComments">,
) {
  return analysis.sectionComments.filter((sectionComment) =>
    sectionComment.phases.some(
      (phase) => phase === "Act" || phase === "Assert",
    ),
  );
}

/**
 * @param commentValue
 * @example
 */
function getSectionPhases(commentValue: string): AaaPhase[] {
  const trimmedComment = commentValue.trim();
  if (trimmedComment.length === 0) {
    return [];
  }

  const parts = trimmedComment.split(/\s*&\s*/u);
  return parts.every(isAaaPhase) ? parts : [];
}

/**
 * @param statement
 * @example
 */
function getStatementExpression(
  statement: ESTree.Statement,
): ESTree.Expression | undefined {
  if (statement.type === "ExpressionStatement") {
    return statement.expression;
  }

  if (
    statement.type === "VariableDeclaration" &&
    statement.declarations.length === 1
  ) {
    return statement.declarations[0]!.init as ESTree.Expression | undefined;
  }

  return void 0;
}

/**
 * @param statement
 * @param sectionComments
 * @example
 */
function getStatementPhases(
  statement: ESTree.Statement,
  sectionComments: TestBlockAnalysis["sectionComments"],
): AaaPhase[] {
  const statementLine = statement.loc?.start.line;
  if (statementLine === void 0) {
    return [];
  }

  let currentPhases: AaaPhase[] = [];
  for (const sectionComment of sectionComments) {
    if (sectionComment.comment.loc.start.line > statementLine) {
      break;
    }

    currentPhases = sectionComment.phases;
  }

  return currentPhases;
}

/**
 * @param node
 * @example
 */
function getSupportedTestCall(node: ESTree.CallExpression):
  | undefined
  | {
      /**
       *
       */
      callback: LocatedNode<
        ESTree.ArrowFunctionExpression | ESTree.FunctionExpression
      > & {
        /**
         *
         */
        body: LocatedNode<ESTree.BlockStatement>;
      };

      /**
       *
       */
      callExpression: LocatedNode<ESTree.CallExpression>;
    } {
  const rootName = getTestRootName(node.callee);
  if (rootName !== "it" && rootName !== "test") {
    return void 0;
  }

  const callbackArgument = node.arguments.at(-1);
  if (
    callbackArgument === void 0 ||
    callbackArgument.type === "SpreadElement" ||
    (callbackArgument.type !== "ArrowFunctionExpression" &&
      callbackArgument.type !== "FunctionExpression") ||
    callbackArgument.body.type !== "BlockStatement"
  ) {
    return void 0;
  }

  return {
    callback: callbackArgument as LocatedNode<
      ESTree.ArrowFunctionExpression | ESTree.FunctionExpression
    > & {
      /**
       *
       */
      body: LocatedNode<ESTree.BlockStatement>;
    },
    callExpression: node as LocatedNode<ESTree.CallExpression>,
  };
}

/**
 * @param callee
 * @example
 */
function getTestRootName(
  callee: ESTree.CallExpression["callee"],
): string | undefined {
  if (callee.type === "Identifier") {
    return callee.name;
  }

  if (callee.type === "MemberExpression" && callee.object.type !== "Super") {
    return getTestRootName(callee.object);
  }

  return void 0;
}

/**
 * @param statement
 * @example
 */
function hasAssertion(statement: ESTree.Statement): boolean {
  let foundAssertion = false;

  visitNode(statement, (node) => {
    if (node.type === "CallExpression" && isAssertionCall(node)) {
      foundAssertion = true;
    }
  });

  return foundAssertion;
}

/**
 * @param statement
 * @example
 */
function hasAsyncLogic(statement: ESTree.Statement): boolean {
  let foundAsyncLogic = false;

  visitNode(statement, (node) => {
    if (node.type === "AwaitExpression") {
      foundAsyncLogic = true;
      return;
    }

    if (
      node.type === "CallExpression" &&
      node.callee.type === "MemberExpression" &&
      node.callee.property.type === "Identifier" &&
      ["catch", "finally", "then"].includes(node.callee.property.name)
    ) {
      foundAsyncLogic = true;
      return;
    }

    if (
      node.type === "NewExpression" &&
      getExpressionName(node.callee) === "Promise"
    ) {
      foundAsyncLogic = true;
    }
  });

  return foundAsyncLogic;
}

/**
 * @param statement
 * @example
 */
function hasAwait(statement: ESTree.Statement): boolean {
  let foundAwait = false;

  visitNode(statement, (node) => {
    if (node.type === "AwaitExpression") {
      foundAwait = true;
    }
  });

  return foundAwait;
}

/**
 * @param sourceText
 * @param comment
 * @example
 */
function hasBlankLineBeforeComment(
  sourceText: string,
  comment: SourceComment,
): boolean {
  if (!isLocatedComment(comment)) {
    return true;
  }

  const lines = sourceText.split(/\r\n|\n/u);
  const previousLine = lines[comment.loc.start.line - 2];
  return previousLine === void 0 || previousLine.trim().length === 0;
}

/**
 * @param statement
 * @example
 */
function hasCapturableActResult(statement: ESTree.Statement): boolean {
  if (statement.type !== "ExpressionStatement") {
    return false;
  }

  const expression = unwrapExpression(statement.expression);
  if (!isActionExpression(expression) || isUtilityLikeExpression(expression)) {
    return false;
  }

  const calleeName = getInvokedName(
    expression as ESTree.CallExpression | ESTree.NewExpression,
  );
  return (
    calleeName === void 0 ||
    (!voidLikeMethodNames.has(calleeName) &&
      !/^(clear|debug|dispatch|emit|info|log|print|publish|reset|set|trigger|warn)/u.test(
        calleeName,
      ))
  );
}

/**
 * @param statement
 * @example
 */
function hasMutation(statement: ESTree.Statement): boolean {
  let foundMutation = false;

  visitNode(statement, (node) => {
    if (
      node.type === "AssignmentExpression" ||
      node.type === "UpdateExpression" ||
      node.type === "UnaryExpression"
    ) {
      if (node.type !== "UnaryExpression" || node.operator === "delete") {
        foundMutation = true;
      }
      return;
    }

    if (
      node.type === "CallExpression" &&
      node.callee.type === "MemberExpression" &&
      node.callee.property.type === "Identifier" &&
      arrayMutationMethods.has(node.callee.property.name)
    ) {
      foundMutation = true;
    }
  });

  return foundMutation;
}

/**
 * @param value
 * @example
 */
function isAaaPhase(value: string): value is AaaPhase {
  return phaseNames.includes(value as AaaPhase);
}

/**
 * @param expression
 * @example
 */
function isActionExpression(
  expression: ESTree.Expression | undefined,
): boolean {
  const unwrappedExpression = unwrapExpression(expression);
  return (
    unwrappedExpression?.type === "AwaitExpression" ||
    unwrappedExpression?.type === "CallExpression" ||
    unwrappedExpression?.type === "NewExpression"
  );
}

/**
 * @param node
 * @example
 */
function isAssertionCall(node: ESTree.CallExpression): boolean {
  if (node.callee.type === "Identifier") {
    return node.callee.name === "expect" || node.callee.name === "assert";
  }

  if (node.callee.type !== "MemberExpression") {
    return false;
  }

  if (
    node.callee.object.type === "Identifier" &&
    node.callee.object.name === "assert"
  ) {
    return true;
  }

  if (node.callee.object.type === "CallExpression") {
    return isAssertionCall(node.callee.object);
  }

  return false;
}

/**
 * @param comment
 * @example
 */
function isLocatedComment(comment: SourceComment): comment is LocatedComment {
  return (
    comment.loc !== null &&
    comment.loc !== undefined &&
    comment.range !== undefined
  );
}

/**
 * @param statement
 * @example
 */
function isMeaningfulActStatement(statement: ESTree.Statement): boolean {
  const expression = getStatementExpression(statement);
  if (expression === void 0) {
    return false;
  }

  return (
    isActionExpression(expression) &&
    !isUtilityLikeExpression(expression) &&
    !hasAssertion(statement)
  );
}

/**
 * @param value
 * @example
 */
function isNode(value: unknown): value is ESTree.Node {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (
      value as {
        /**
         *
         */
        type?: unknown;
      }
    ).type === "string"
  );
}

/**
 * @param range
 * @param container
 * @example
 */
function isRangeWithin(
  range: [number, number],
  container: [number, number],
): boolean {
  return range[0] >= container[0] && range[1] <= container[1];
}

/**
 * @param expression
 * @example
 */
function isRuleCreateInvocation(
  expression: ESTree.CallExpression | ESTree.NewExpression,
): boolean {
  return (
    expression.type === "CallExpression" &&
    expression.callee.type === "MemberExpression" &&
    expression.callee.object.type === "Identifier" &&
    expression.callee.property.type === "Identifier" &&
    expression.callee.property.name === "create" &&
    expression.callee.object.name.endsWith("Rule")
  );
}

/**
 * @param statement
 * @example
 */
function isSetupLikeStatement(statement: ESTree.Statement): boolean {
  if (statement.type === "VariableDeclaration") {
    return statement.declarations.every((declaration) => {
      if (declaration.init === null) {
        return true;
      }

      const init = unwrapExpression(declaration.init);
      return !isActionExpression(init) || isUtilityLikeExpression(init);
    });
  }

  const expression = getStatementExpression(statement);
  return expression !== void 0 && isUtilityLikeExpression(expression);
}

/**
 * @param expression
 * @example
 */
function isUtilityLikeExpression(
  expression: ESTree.Expression | undefined,
): boolean {
  const unwrappedExpression = unwrapExpression(expression);
  if (
    unwrappedExpression?.type !== "CallExpression" &&
    unwrappedExpression?.type !== "NewExpression"
  ) {
    return false;
  }

  const calleeName = getExpressionName(unwrappedExpression.callee);
  if (calleeName === void 0) {
    return false;
  }

  if (
    unwrappedExpression.type === "NewExpression" &&
    (calleeName === "Map" ||
      calleeName === "Set" ||
      calleeName === "SourceCode" ||
      calleeName === "ESLint")
  ) {
    return true;
  }

  if (isRuleCreateInvocation(unwrappedExpression)) {
    return false;
  }

  if (utilityMethodNames.has(calleeName) || setupLikeNames.test(calleeName)) {
    return true;
  }

  return (
    unwrappedExpression.callee.type === "MemberExpression" &&
    unwrappedExpression.callee.object.type === "Identifier" &&
    ["console", "vi"].includes(unwrappedExpression.callee.object.name)
  );
}

/**
 * @param statement
 * @example
 */
function isValidAssertStatement(statement: ESTree.Statement): boolean {
  if (hasAssertion(statement)) {
    return true;
  }

  if (statement.type !== "VariableDeclaration") {
    return false;
  }

  return statement.declarations.every((declaration) => {
    if (declaration.init === null) {
      return true;
    }

    const init = unwrapExpression(declaration.init);
    return !isActionExpression(init);
  });
}

/**
 * @param expression
 * @example
 */
function unwrapExpression(
  expression: ESTree.Expression | undefined,
): ESTree.Expression | undefined {
  if (expression?.type === "ChainExpression") {
    return unwrapExpression(expression.expression);
  }

  if (expression?.type === "AwaitExpression") {
    return expression.argument;
  }

  return expression;
}

/**
 * @param name
 * @param prefix
 * @example
 */
function usesPrefix(name: string, prefix: "actual" | "expected"): boolean {
  return name === prefix || name.startsWith(prefix);
}

/**
 * @param node
 * @param callback
 * @param seenNodes
 * @example
 */
function visitNode(
  node: ESTree.Node,
  callback: (node: ESTree.Node) => void,
  seenNodes = new WeakSet<object>(),
): void {
  if (seenNodes.has(node)) {
    return;
  }

  seenNodes.add(node);
  callback(node);

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) {
          visitNode(item, callback, seenNodes);
        }
      }
      continue;
    }

    if (isNode(value)) {
      visitNode(value, callback, seenNodes);
    }
  }
}

export {
  aaaPhaseOrder,
  analyzeTestBlock,
  countActStatements,
  getAssertDeclaredIdentifiers,
  getAssertionIdentifiers,
  getFlattenedSections,
  getIndentationAtOffset,
  getLineStartRange,
  getPhaseBoundaryComments,
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
};
