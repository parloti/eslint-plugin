import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";
import type { MemberAnalysisScope } from "./member-scope-utilities";

import {
  isSameSymbol,
  resolveCanonicalSymbol,
} from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { completeFlow } from "./member-flow-graph-utilities";
import { getFunctionFacts, hasFunctionBody } from "./member-function-utilities";
import { getUsageType } from "./member-operation-type-utilities";
import { getResolvedCallDeclaration } from "./member-usage-call-utilities";

const factoryResults = new WeakMap<
  MemberAnalysisScope,
  WeakMap<ts.Node, WeakMap<ts.Expression, boolean>>
>();

/**
 * Checks declaration identity through completed local factory-return summaries.
 * @param expression Value being copied or serialized.
 * @param checker TypeScript type checker.
 * @param member Member whose declaration must be present.
 * @param scope Eligible production implementations.
 * @returns Whether the value or a reachable factory return carries the member.
 * @example
 * ```typescript
 * const used = carriesMember(expression, checker, member, scope);
 * ```
 */
const carriesMember = (
  expression: ts.Expression,
  checker: ts.TypeChecker,
  member: PublicMember,
  scope: MemberAnalysisScope,
): boolean => {
  let candidates = factoryResults.get(scope);
  if (candidates === void 0) {
    candidates = new WeakMap();
    factoryResults.set(scope, candidates);
  }
  let completed = candidates.get(member.declaration);
  if (completed === void 0) {
    completed = new WeakMap();
    candidates.set(member.declaration, completed);
  }
  return completeFlow(expression, completed, (value) => {
    const symbol = ts.isShorthandPropertyAssignment(value.parent)
      ? checker.getShorthandAssignmentValueSymbol(value.parent)
      : checker.getSymbolAtLocation(value);
    if (
      ts.isVariableDeclaration(member.hostDeclaration) &&
      member.hostSymbol !== void 0 &&
      symbol !== void 0 &&
      isSameSymbol(
        resolveCanonicalSymbol(symbol, checker),
        resolveCanonicalSymbol(member.hostSymbol, checker),
      )
    ) {
      return { dependencies: [], used: true };
    }
    const property = checker.getPropertyOfType(
      checker.getNonNullableType(getUsageType(value, checker)),
      member.memberName,
    );
    const declaredProperty = checker.getPropertyOfType(
      getUsageType(member.hostDeclaration, checker),
      member.memberName,
    );
    if (
      property !== void 0 &&
      (isSameSymbol(property, member.memberSymbol) ||
        (declaredProperty !== void 0 &&
          isSameSymbol(property, declaredProperty)))
    ) {
      return { dependencies: [], used: true };
    }
    const declaration = ts.isCallExpression(value)
      ? getResolvedCallDeclaration(value, checker)
      : void 0;
    return {
      dependencies:
        hasFunctionBody(declaration) &&
        scope.sourceFiles.has(declaration.getSourceFile())
          ? getFunctionFacts(declaration).returns
          : [],
      used: false,
    };
  });
};

export { carriesMember };
