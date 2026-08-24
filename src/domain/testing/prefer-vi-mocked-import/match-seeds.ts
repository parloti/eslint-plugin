import type * as ESTree from "estree";

import {
  getFactoryReturnObject,
  getModuleSpecifier,
  hasRange,
} from "./match-helpers";

/** Type definition for rule data. */
interface MatchSeed {
  /** Returned object expression from the mock factory. */
  factoryObject: ESTree.ObjectExpression;

  /** Expression statement containing `vi.mock` or `vi.doMock`. */
  mockStatement: ESTree.ExpressionStatement;

  /** Module path string extracted from the first mock argument. */
  moduleSpecifier: string;

  /** Original first argument node, including `range`, for fixer use. */
  specifierExpression: ESTree.Expression & {
    /** Source range for the mock specifier expression. */
    range: [number, number];
  };
}

/**
 * Collects seed data for every supported mock statement in the file.
 * @param program Program node.
 * @returns Match seeds.
 * @example
 * ```typescript
 * const seeds = collectSeeds({ body: [], sourceType: "module", type: "Program" } as never);
 * void seeds;
 * ```
 */
function collectSeeds(program: ESTree.Program): MatchSeed[] {
  if (!Array.isArray(program.body)) {
    return [];
  }

  return program.body.flatMap((statement) => {
    const expression = getMockCallExpression(statement);

    if (expression === void 0) {
      return [];
    }

    const callArguments = getMockCallArguments(expression);

    if (callArguments === void 0) {
      return [];
    }

    const seed = createSeed(
      statement as ESTree.ExpressionStatement,
      callArguments[0],
      callArguments[1],
    );

    return seed === void 0 ? [] : [seed];
  });
}

/**
 * Creates seed data from validated call arguments.
 * @param mockStatement Matched `vi.mock` statement.
 * @param specifierExpression First argument expression.
 * @param factoryExpression Factory callback expression.
 * @returns Match seed when arguments are supported.
 * @example
 * ```typescript
 * const seed = createSeed({ expression: { arguments: [], type: "CallExpression" }, type: "ExpressionStatement" } as never, { type: "Literal", value: "./x" } as never, { body: { properties: [], type: "ObjectExpression" }, type: "ArrowFunctionExpression" } as never);
 * void seed;
 * ```
 */
function createSeed(
  mockStatement: ESTree.ExpressionStatement,
  specifierExpression: ESTree.Expression,
  factoryExpression: ESTree.Expression,
): MatchSeed | undefined {
  if (!hasRange(specifierExpression)) {
    return void 0;
  }

  const moduleSpecifier = getModuleSpecifier(specifierExpression);
  const factoryObject = getFactoryReturnObject(factoryExpression);
  return moduleSpecifier === void 0 || factoryObject === void 0
    ? void 0
    : { factoryObject, mockStatement, moduleSpecifier, specifierExpression };
}

/**
 * Returns mock call arguments when both arguments are supported expressions.
 * @param expression Call expression node.
 * @returns First and second call arguments.
 * @example
 * ```typescript
 * const args = getMockCallArguments({ arguments: [], type: "CallExpression" } as never);
 * void args;
 * ```
 */
function getMockCallArguments(
  expression: ESTree.CallExpression,
): [ESTree.Expression, ESTree.Expression] | undefined {
  const [firstArgument, secondArgument] = expression.arguments;
  if (firstArgument === void 0 || secondArgument === void 0) {
    return void 0;
  }
  if (
    firstArgument.type === "SpreadElement" ||
    secondArgument.type === "SpreadElement"
  ) {
    return void 0;
  }

  return [firstArgument, secondArgument];
}

/**
 * Returns the call expression for a supported mock statement.
 * @param statement Candidate statement.
 * @returns Supported mock call expression when present.
 * @example
 * ```typescript
 * const expression = getMockCallExpression({ type: "EmptyStatement" } as never);
 * void expression;
 * ```
 */
function getMockCallExpression(
  statement: ESTree.Program["body"][number],
): ESTree.CallExpression | undefined {
  if (statement.type !== "ExpressionStatement") {
    return void 0;
  }

  const { expression } = statement;
  if (
    expression.type !== "CallExpression" ||
    expression.callee.type !== "MemberExpression"
  ) {
    return void 0;
  }

  const { object, property } = expression.callee;
  return object.type === "Identifier" &&
    object.name === "vi" &&
    property.type === "Identifier" &&
    (property.name === "mock" || property.name === "doMock")
    ? expression
    : void 0;
}

export type { MatchSeed };
export { collectSeeds };
