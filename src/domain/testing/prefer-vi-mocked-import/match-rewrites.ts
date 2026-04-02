import type * as ESTree from "estree";

import type { Binding, Declaration, MemberRewrite } from "./types";

import { hasRange } from "./match-helpers";
import { walkNode } from "./match-walk";

/**
 * Adds declaration identifier range to the allowed set.
 * @param allowedRanges Allowed range set.
 * @param declaration Declaration to include.
 * @example
 * ```typescript
 * const allowed = new Set<string>();
 * addDeclarationIdRange(allowed, void 0);
 * ```
 */
function addDeclarationIdRange(
  allowedRanges: Set<string>,
  declaration: Declaration | undefined,
): void {
  if (declaration !== void 0) {
    const rangeKey = `${declaration.declarationIdRange[0]}:${declaration.declarationIdRange[1]}`;
    allowedRanges.add(rangeKey);
  }
}

/**
 * Returns false if a binding local is used outside allowed rewrite sites.
 * @param program Program node containing mock usage.
 * @param allowedIdentifierRanges Identifier ranges that are safe to rewrite.
 * @param localNames Local names tracked by the matcher.
 * @returns True when all local usages are safe.
 * @example
 * ```typescript
 * const safe = areLocalsSafeToInline({ body: [], sourceType: "module", type: "Program" } as never, new Set(), new Set());
 * void safe;
 * ```
 */
function areLocalsSafeToInline(
  program: ESTree.Program,
  allowedIdentifierRanges: Set<string>,
  localNames: Set<string>,
): boolean {
  let isSafe = true;
  walkNode(program, (currentNode) => {
    if (
      !isSafe ||
      currentNode.type !== "Identifier" ||
      !hasRange(currentNode)
    ) {
      return;
    }

    const key = `${currentNode.range[0]}:${currentNode.range[1]}`;
    if (localNames.has(currentNode.name) && !allowedIdentifierRanges.has(key)) {
      isSafe = false;
    }
  });

  return isSafe;
}

/**
 * Builds a set of allowed identifier ranges for safe-inline validation.
 * @param bindings Bindings list.
 * @param declarations Declarations map.
 * @param rewrites Member rewrites.
 * @returns Allowed identifier range keys.
 * @example
 * ```typescript
 * const ranges = buildAllowedRanges([], new Map(), []);
 * void ranges;
 * ```
 */
function buildAllowedRanges(
  bindings: Binding[],
  declarations: Map<string, Declaration>,
  rewrites: MemberRewrite[],
): Set<string> {
  const allowedRanges = new Set<string>();
  for (const binding of bindings) {
    allowedRanges.add(
      `${binding.propertyKeyRange[0]}:${binding.propertyKeyRange[1]}`,
    );
    allowedRanges.add(
      `${binding.propertyValueRange[0]}:${binding.propertyValueRange[1]}`,
    );
    addDeclarationIdRange(allowedRanges, declarations.get(binding.localName));
  }
  for (const rewrite of rewrites) {
    allowedRanges.add(
      `${rewrite.localObjectRange[0]}:${rewrite.localObjectRange[1]}`,
    );
  }

  return allowedRanges;
}

/**
 * Collects member-expression object rewrites for `.mock*` calls.
 * @param program Program node.
 * @param localToExported Local to exported name map.
 * @returns Collected member rewrites.
 * @example
 * ```typescript
 * const rewrites = collectMemberRewrites({ body: [], sourceType: "module", type: "Program" } as never, new Map());
 * void rewrites;
 * ```
 */
function collectMemberRewrites(
  program: ESTree.Program,
  localToExported: Map<string, string>,
): MemberRewrite[] {
  const rewrites: MemberRewrite[] = [];
  walkNode(program, (currentNode) => {
    const rewrite = toMemberRewrite(currentNode, localToExported);
    if (rewrite !== void 0) {
      rewrites.push(rewrite);
    }
  });

  return rewrites;
}

/**
 * Converts a node into a member rewrite when supported.
 * @param currentNode Candidate node.
 * @param localToExported Local to exported name map.
 * @returns Member rewrite when node is supported.
 * @example
 * ```typescript
 * const rewrite = toMemberRewrite({ type: "Identifier", name: "x" } as never, new Map());
 * void rewrite;
 * ```
 */
function toMemberRewrite(
  currentNode: ESTree.Node,
  localToExported: Map<string, string>,
): MemberRewrite | undefined {
  if (currentNode.type !== "MemberExpression") {
    return void 0;
  }

  const { object, property } = currentNode;
  if (
    object.type !== "Identifier" ||
    !hasRange(object) ||
    property.type !== "Identifier" ||
    !property.name.startsWith("mock")
  ) {
    return void 0;
  }

  const exportedName = localToExported.get(object.name);
  return exportedName === void 0
    ? void 0
    : { exportedName, localObjectRange: object.range };
}

export { areLocalsSafeToInline, buildAllowedRanges, collectMemberRewrites };
