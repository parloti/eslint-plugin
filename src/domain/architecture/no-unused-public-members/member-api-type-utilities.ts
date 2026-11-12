import * as ts from "typescript";

import type { SymbolIndex } from "./member-symbol-index-utilities";

import { resolveCanonicalSymbol } from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { canTypeContainMember } from "./member-api-relevance-utilities";
import {
  addIndexedSymbol,
  hasIndexedSymbol,
} from "./member-symbol-index-utilities";

type CompletedTypes = WeakMap<ts.Type, Map<number, boolean>>;

interface TypeState {
  depth: number;
  type: ts.Type;
}

const completedQueries = new WeakMap<
  ts.Program,
  WeakMap<ts.Symbol, WeakMap<ts.Node, CompletedTypes>>
>();

const getCompletedQueries = (
  program: ts.Program,
  member: ts.Symbol,
  location: ts.Node,
): CompletedTypes => {
  let byMember = completedQueries.get(program);
  if (byMember === void 0) {
    byMember = new WeakMap();
    completedQueries.set(program, byMember);
  }
  let byLocation = byMember.get(member);
  if (byLocation === void 0) {
    byLocation = new WeakMap();
    byMember.set(member, byLocation);
  }
  let completed = byLocation.get(location);
  if (completed === void 0) {
    completed = new WeakMap();
    byLocation.set(location, completed);
  }
  return completed;
};

const setCompletedType = (
  completed: CompletedTypes,
  state: TypeState,
  exposed: boolean,
): void => {
  let byDepth = completed.get(state.type);
  if (byDepth === void 0) {
    byDepth = new Map();
    completed.set(state.type, byDepth);
  }
  byDepth.set(state.depth, exposed);
};

/**
 * Resolves nested types only as the member query requests them.
 * @param state Current type and remaining nesting budget.
 * @param checker Program's type checker.
 * @param location API source used for semantic resolution.
 * @yields {TypeState} The next reachable type and its remaining budget.
 * @example
 * ```typescript
 * const children = getNestedTypes(state, checker, sourceFile);
 * ```
 */
function* getNestedTypes(
  state: TypeState,
  checker: ts.TypeChecker,
  location: ts.Node,
): Generator<TypeState> {
  const { depth, type } = state;
  if (type.isUnionOrIntersection()) {
    for (const constituent of type.types) {
      yield { depth, type: constituent };
    }
    return;
  }
  if (depth === 0) {
    return;
  }
  for (const kind of [ts.IndexKind.Number, ts.IndexKind.String]) {
    const indexType = checker.getIndexTypeOfType(type, kind);
    if (indexType !== void 0) {
      yield { depth: depth - 1, type: indexType };
    }
  }
  for (const kind of [ts.SignatureKind.Call, ts.SignatureKind.Construct]) {
    for (const signature of checker.getSignaturesOfType(type, kind)) {
      yield {
        depth: depth - 1,
        type: checker.getReturnTypeOfSignature(signature),
      };
      for (const parameter of signature.getParameters()) {
        yield {
          depth: depth - 1,
          type: checker.getTypeOfSymbolAtLocation(parameter, location),
        };
      }
    }
  }
  for (const property of checker.getPropertiesOfType(type)) {
    yield {
      depth: depth - 1,
      type: checker.getTypeOfSymbolAtLocation(property, location),
    };
  }
}

/**
 * Searches one export type for a member without collecting unrelated symbols.
 * @param type Export's value or declared type.
 * @param member Candidate member symbol.
 * @param program Program owning semantic facts.
 * @param location API entry used for property and parameter type resolution.
 * @returns Whether the export exposes the member within the existing type budget.
 * @example
 * ```typescript
 * const exposed = hasTypeMember(type, memberSymbol, program, sourceFile);
 * ```
 */
const hasTypeMember = (
  type: ts.Type,
  member: ts.Symbol,
  program: ts.Program,
  location: ts.Node,
): boolean => {
  const checker = program.getTypeChecker();
  const completed = getCompletedQueries(program, member, location);
  const target: SymbolIndex = new Set();
  addIndexedSymbol(target, member);
  const root = { depth: 6, type };
  const visited = new Map<ts.Type, number>();
  const pending: Iterator<TypeState>[] = [[root][Symbol.iterator]()];
  while (pending.length > 0) {
    const iterator = pending.at(-1);
    if (iterator === void 0) {
      break;
    }
    const next = iterator.next();
    if (next.done === true) {
      pending.pop();
      continue;
    }
    const state = next.value;
    if ((visited.get(state.type) ?? -1) >= state.depth) {
      continue;
    }
    visited.set(state.type, state.depth);
    const cached = completed.get(state.type)?.get(state.depth);
    if (cached === false) {
      continue;
    }
    const property = state.type.isUnionOrIntersection()
      ? void 0
      : checker.getPropertyOfType(state.type, member.getName());
    if (
      cached === true ||
      (property !== void 0 &&
        hasIndexedSymbol(target, resolveCanonicalSymbol(property, checker)))
    ) {
      setCompletedType(completed, state, true);
      setCompletedType(completed, root, true);
      return true;
    }
    if (
      !state.type.isUnionOrIntersection() &&
      !canTypeContainMember(state.type, member, program)
    ) {
      continue;
    }
    pending.push(getNestedTypes(state, checker, location));
  }
  for (const [visitedType, depth] of visited) {
    setCompletedType(completed, { depth, type: visitedType }, false);
  }
  return false;
};

export { hasTypeMember };
