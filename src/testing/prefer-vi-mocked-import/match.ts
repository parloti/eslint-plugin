import type { Rule } from "eslint";
import type * as ESTree from "estree";

import type { RuleMatch } from "./types";

import { collectBindings } from "./match-bindings";
import { collectDeclarations } from "./match-declarations";
import {
  getFactoryReturnObject,
  getModuleSpecifier,
  getNewline,
  hasRange,
} from "./match-helpers";
import { resolveImportPlan } from "./match-imports";
import {
  areLocalsSafeToInline,
  buildAllowedRanges,
  collectMemberRewrites,
} from "./match-rewrites";

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
 * Builds a full rule match from seed data.
 * @param context Rule context.
 * @param program Program node.
 * @param seed Seed data.
 * @returns Rule match when safe.
 * @example
 * ```typescript
 * const match = buildMatch({ sourceCode: { text: "" } } as never, { body: [], sourceType: "module", type: "Program" } as never, { factoryObject: { properties: [], type: "ObjectExpression" }, mockStatement: { expression: { arguments: [], type: "CallExpression" }, type: "ExpressionStatement" }, moduleSpecifier: "./x", specifierExpression: { range: [0, 1], type: "Literal", value: "./x" } as never });
 * void match;
 * ```
 */
function buildMatch(
  context: Rule.RuleContext,
  program: ESTree.Program,
  seed: MatchSeed,
): RuleMatch | undefined {
  const declarations = collectDeclarations(program, context.sourceCode);
  const bindings = collectBindings(seed.factoryObject, declarations);
  if (bindings.length === 0) {
    return void 0;
  }

  const memberRewrites = collectMemberRewrites(program, toLocalMap(bindings));
  const localNames = new Set(bindings.map((binding) => binding.localName));
  const allowedRanges = buildAllowedRanges(
    bindings,
    declarations,
    memberRewrites,
  );
  if (!areLocalsSafeToInline(program, allowedRanges, localNames)) {
    return void 0;
  }

  return {
    bindings,
    declarations,
    importPlan: resolveImportPlan(
      program,
      seed.moduleSpecifier,
      getImportNames(bindings),
    ),
    memberRewrites,
    mockSpecifierIsImportExpression:
      seed.specifierExpression.type === "ImportExpression",
    mockSpecifierRange: seed.specifierExpression.range,
    moduleSpecifier: seed.moduleSpecifier,
    newline: getNewline(context.sourceCode.text),
    node: seed.mockStatement as unknown as Rule.Node,
    sourceText: context.sourceCode.text,
  };
}

/**
 * Collects the first applicable rule match from the file.
 * @param context Rule context.
 * @returns Collected match when pattern is found.
 * @example
 * ```typescript
 * const match = collectMatch({ sourceCode: { ast: { body: [], sourceType: "module", type: "Program" }, text: "" } } as never);
 * void match;
 * ```
 */
function collectMatch(context: Rule.RuleContext): RuleMatch | undefined {
  const program = context.sourceCode.ast as ESTree.Program;
  const seed = collectSeed(program);
  return seed === void 0 ? void 0 : buildMatch(context, program, seed);
}

/**
 * Collects seed data needed to build a full match.
 * @param program Program node.
 * @returns Match seed.
 * @example
 * ```typescript
 * const seed = collectSeed({ body: [], sourceType: "module", type: "Program" } as never);
 * void seed;
 * ```
 */
function collectSeed(program: ESTree.Program): MatchSeed | undefined {
  const mockStatement = findMockStatement(program);
  if (mockStatement === void 0) {
    return void 0;
  }

  const { expression } = mockStatement;
  if (expression.type !== "CallExpression") {
    return void 0;
  }

  const callArguments = getMockCallArguments(expression);
  if (callArguments === void 0) {
    return void 0;
  }

  return createSeed(mockStatement, callArguments[0], callArguments[1]);
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
 * Returns the first top-level `vi.mock` or `vi.doMock` statement.
 * @param program Program node.
 * @returns Matching expression statement.
 * @example
 * ```typescript
 * const statement = findMockStatement({ body: [], sourceType: "module", type: "Program" } as never);
 * void statement;
 * ```
 */
function findMockStatement(
  program: ESTree.Program,
): ESTree.ExpressionStatement | undefined {
  return program.body.find(
    (statement): statement is ESTree.ExpressionStatement =>
      isMockExpressionStatement(statement),
  );
}

/**
 * Returns sorted unique import names from bindings.
 * @param bindings Bindings list.
 * @returns Sorted import names.
 * @example
 * ```typescript
 * const names = getImportNames([]);
 * void names;
 * ```
 */
function getImportNames(bindings: RuleMatch["bindings"]): string[] {
  return [
    ...new Set(bindings.map((binding) => binding.exportedName)),
  ].toSorted();
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
 * Checks whether a statement is a supported mock expression statement.
 * @param statement Candidate statement.
 * @returns True when statement is a supported mock call.
 * @example
 * ```typescript
 * const ok = isMockExpressionStatement({ type: "EmptyStatement" } as never);
 * void ok;
 * ```
 */
function isMockExpressionStatement(
  statement: ESTree.Program["body"][number],
): boolean {
  if (statement.type !== "ExpressionStatement") {
    return false;
  }

  const { expression } = statement;
  if (
    expression.type !== "CallExpression" ||
    expression.callee.type !== "MemberExpression"
  ) {
    return false;
  }

  const { object, property } = expression.callee;
  return (
    object.type === "Identifier" &&
    object.name === "vi" &&
    property.type === "Identifier" &&
    (property.name === "mock" || property.name === "doMock")
  );
}

/**
 * Creates local-to-exported mapping from bindings.
 * @param bindings Bindings list.
 * @returns Mapping used for rewrite lookup.
 * @example
 * ```typescript
 * const map = toLocalMap([]);
 * void map;
 * ```
 */
function toLocalMap(bindings: RuleMatch["bindings"]): Map<string, string> {
  return new Map(
    bindings.map(
      (binding) => [binding.localName, binding.exportedName] as const,
    ),
  );
}

export { collectMatch };
