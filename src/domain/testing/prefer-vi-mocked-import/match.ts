import type { Rule } from "eslint";
import type * as ESTree from "estree";

import type { MatchSeed } from "./match-seeds";
import type { RuleMatch } from "./types";

import { collectBindings } from "./match-bindings";
import { hasUnsafeImportCollisions } from "./match-collisions";
import { collectDeclarations } from "./match-declarations";
import { getNewline } from "./match-helpers";
import { resolveImportPlan } from "./match-imports";
import {
  areLocalsSafeToInline,
  buildAllowedRanges,
  collectMemberRewrites,
} from "./match-rewrites";
import { collectSeeds } from "./match-seeds";

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
  if (
    hasUnsafeImportCollisions(
      program,
      seed.moduleSpecifier,
      bindings,
      declarations,
    )
  ) {
    return void 0;
  }
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
 * Collects every applicable rule match from the file.
 * @param context Rule context.
 * @returns Collected matches when patterns are found.
 * @example
 * ```typescript
 * const matches = collectMatches({ sourceCode: { ast: { body: [], sourceType: "module", type: "Program" }, text: "" } } as never);
 * void matches;
 * ```
 */
function collectMatches(context: Rule.RuleContext): RuleMatch[] {
  const program = context.sourceCode.ast as ESTree.Program;

  return collectSeeds(program)
    .map((seed) => buildMatch(context, program, seed))
    .filter((match): match is RuleMatch => match !== void 0);
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
  return [...new Set(bindings.map((binding) => binding.exportedName))].toSorted(
    (left, right) => (left === right ? 0 : left < right ? -1 : 1),
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

export { collectMatches };
