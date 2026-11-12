import * as ts from "typescript";

import type { PublicMember } from "./member-declaration-utilities";
import type { MemberAnalysisScope } from "./member-scope-utilities";

import {
  getUsageContextualType,
  getUsageType,
} from "./member-operation-type-utilities";
import { getResolvedCallDeclaration } from "./member-usage-call-utilities";
import {
  isCallArgumentMember,
  isObjectContractHandoff,
} from "./member-usage-handoff-utilities";
import { isLocalCallArgumentTransmitted } from "./member-usage-local-flow-utilities";
import {
  getStringLiteralKeys,
  isComputedMemberRead,
} from "./member-usage-reference-utilities";
import { isLocalCallArgumentSerialized } from "./member-usage-serialization-utilities";
import { getRelatedMemberSymbols } from "./member-usage-utilities";
import { isWholeObjectRead } from "./member-usage-whole-object-utilities";

interface OperationIndex {
  completed: WeakSet<ts.Node>;
  summaries: WeakMap<ts.Node, OperationSummary>;
  used: WeakSet<ts.Node>;
}

type OperationSummary = (member: PublicMember) => boolean;

const operationSummaries = new WeakMap<MemberAnalysisScope, OperationIndex>();

const isPrimitiveLiteralArgument = (node: ts.Expression): boolean =>
  ts.isStringLiteralLike(node) ||
  ts.isNumericLiteral(node) ||
  ts.isBigIntLiteral(node) ||
  node.kind === ts.SyntaxKind.TrueKeyword ||
  node.kind === ts.SyntaxKind.FalseKeyword ||
  node.kind === ts.SyntaxKind.NullKeyword;

const createOperationConsumer = (
  node: ts.Node,
  checker: ts.TypeChecker,
  program: ts.Program,
  scope: MemberAnalysisScope,
): OperationSummary => {
  if (ts.isElementAccessExpression(node)) {
    let keys = new Set<string>();
    let dynamic = false;
    if (ts.isStringLiteralLike(node.argumentExpression)) {
      keys.add(node.argumentExpression.text);
    } else {
      const keyType = getUsageType(node.argumentExpression, checker);
      keys = new Set(getStringLiteralKeys(keyType));
      dynamic = keys.size === 0 && (keyType.flags & ts.TypeFlags.String) !== 0;
    }
    return (member) =>
      (dynamic || keys.has(member.memberName)) &&
      isComputedMemberRead(
        node,
        checker,
        member,
        getRelatedMemberSymbols(member, scope, checker),
      );
  }
  if (ts.isSpreadAssignment(node)) {
    return (member) => isWholeObjectRead(node, checker, member, program, scope);
  }
  if (ts.isCallExpression(node)) {
    if (
      !node.arguments.some((argument) => !isPrimitiveLiteralArgument(argument))
    ) {
      return () => false;
    }
    const stringify =
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "stringify";
    const declaration = getResolvedCallDeclaration(node, checker);
    const implemented =
      declaration !== void 0 &&
      "body" in declaration &&
      declaration.body !== void 0;
    return (member) =>
      (stringify &&
        (isWholeObjectRead(node, checker, member, program, scope) ||
          isCallArgumentMember(node, checker, member, scope))) ||
      (implemented
        ? isLocalCallArgumentSerialized(
            node,
            checker,
            member,
            program,
            scope,
          ) || isLocalCallArgumentTransmitted(node, checker, member, scope)
        : !stringify &&
          declaration !== void 0 &&
          (isWholeObjectRead(node, checker, member, program, scope) ||
            isCallArgumentMember(node, checker, member, scope)));
  }
  return (ts.isPropertyAssignment(node) ||
    ts.isShorthandPropertyAssignment(node)) &&
    ts.isObjectLiteralExpression(node.parent) &&
    getUsageContextualType(node.parent, checker) !== void 0
    ? (member) => isObjectContractHandoff(node, checker, member, scope)
    : () => false;
};

/**
 * Summarizes operations against pending candidates and reuses completed answers.
 * @param operations Syntax-only catalog inside the owning scope.
 * @param candidates Members not already consumed by direct or adapter reads.
 * @param program Active semantic snapshot.
 * @param scope Configuration-specific owner and eligible local implementations.
 * @returns Candidate members consumed by at least one operation.
 * @example
 * ```typescript
 * const used = collectOperationMembers(index.operations, pending, program, scope);
 * ```
 */
const collectOperationMembers = (
  operations: readonly ts.Node[],
  candidates: readonly PublicMember[],
  program: ts.Program,
  scope: MemberAnalysisScope,
): Set<PublicMember> => {
  const pending = new Set<PublicMember>();
  const used = new Set<PublicMember>();
  const checker = program.getTypeChecker();
  let index = operationSummaries.get(scope);
  if (index === void 0) {
    index = {
      completed: new WeakSet(),
      summaries: new WeakMap(),
      used: new WeakSet(),
    };
    operationSummaries.set(scope, index);
  }
  for (const member of candidates) {
    if (index.used.has(member.declaration)) {
      used.add(member);
    } else if (!index.completed.has(member.declaration)) {
      pending.add(member);
    }
  }
  for (const operation of operations) {
    if (pending.size === 0) {
      break;
    }
    let summary = index.summaries.get(operation);
    if (summary === void 0) {
      summary = createOperationConsumer(operation, checker, program, scope);
      index.summaries.set(operation, summary);
    }
    const consumed: PublicMember[] = [];
    for (const member of pending) {
      if (!summary(member)) {
        continue;
      }

      consumed.push(member);
    }
    for (const member of consumed) {
      pending.delete(member);
      used.add(member);
      index.used.add(member.declaration);
    }
  }
  for (const member of candidates) {
    index.completed.add(member.declaration);
  }
  return used;
};

export { collectOperationMembers };
