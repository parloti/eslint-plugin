import type { Rule } from "eslint";
import type * as ESTree from "estree";

import type { Declaration } from "./types";

import { hasRange, isViFunctionCall } from "./match-helpers";

/**
 * Collects top-level `const x = vi.fn(...)` declarations.
 * @param program Program node.
 * @param sourceCode Source code wrapper used to inspect attached comments.
 * @returns Declarations by local name.
 * @example
 * ```typescript
 * const declarations = collectDeclarations({ body: [], sourceType: "module", type: "Program" } as never);
 * void declarations;
 * ```
 */
function collectDeclarations(
  program: ESTree.Program,
  sourceCode?: Rule.RuleContext["sourceCode"],
): Map<string, Declaration> {
  const declarations = program.body
    .map((statement) => toDeclaration(statement, sourceCode))
    .filter(
      (declaration): declaration is Declaration => declaration !== void 0,
    );

  return new Map(
    declarations.map((declaration) => [declaration.localName, declaration]),
  );
}

/**
 * Finds the earliest attached leading comment range for a declaration.
 * @param commentsBefore Comments that appear before the declaration.
 * @param sourceCode Source code wrapper used to inspect interstitial text.
 * @param statementStart Original declaration start offset.
 * @returns Earliest attached comment start, or the statement start.
 * @example
 * ```typescript
 * const start = getAttachedCommentStart([], void 0, 10);
 * void start;
 * ```
 */
function getAttachedCommentStart(
  commentsBefore: readonly ESTree.Comment[],
  sourceCode: Rule.RuleContext["sourceCode"] | undefined,
  statementStart: number,
): number {
  let removalStart = statementStart;
  let nextStart = statementStart;

  for (const comment of commentsBefore.toReversed()) {
    const commentStart = getNextAttachedCommentStart(
      comment,
      sourceCode,
      nextStart,
    );
    if (commentStart === void 0) {
      break;
    }

    removalStart = commentStart;
    nextStart = commentStart;
  }

  return removalStart;
}

/**
 * Returns the next attached comment start when a comment remains linked to the declaration.
 * @param comment Candidate leading comment.
 * @param sourceCode Source code wrapper used to inspect interstitial text.
 * @param nextStart Current boundary that the comment must attach to.
 * @returns Comment start when attached, otherwise `undefined`.
 * @example
 * ```typescript
 * const start = getNextAttachedCommentStart({ type: "Block", value: "x" } as never, void 0, 5);
 * void start;
 * ```
 */
function getNextAttachedCommentStart(
  comment: ESTree.Comment,
  sourceCode: Rule.RuleContext["sourceCode"] | undefined,
  nextStart: number,
): number | undefined {
  const commentRange = comment.range;

  if (commentRange === void 0) {
    return void 0;
  }

  const [commentStart, commentEnd] = commentRange;
  const gapText = sourceCode?.text.slice(commentEnd, nextStart) ?? "";

  return isAttachedLeadingGap(gapText) ? commentStart : void 0;
}

/**
 * Returns the declaration removal range, including directly attached comments.
 * @param statement Variable declaration statement.
 * @param sourceCode Source code wrapper when available.
 * @returns Statement range expanded to attached leading comments.
 * @example
 * ```typescript
 * const range = getRemovalRange({ range: [5, 10], type: "VariableDeclaration" } as never);
 * void range;
 * ```
 */
function getRemovalRange(
  statement: ESTree.VariableDeclaration & {
    /** Source range for the full declaration statement. */
    range: [number, number];
  },
  sourceCode?: Rule.RuleContext["sourceCode"],
): [number, number] {
  const [statementStart, statementEnd] = statement.range;
  const commentsBefore = sourceCode?.getCommentsBefore(statement) ?? [];
  const removalStart = getAttachedCommentStart(
    commentsBefore,
    sourceCode,
    statementStart,
  );

  return [removalStart, statementEnd];
}

/**
 * Returns true when whitespace between a comment and declaration keeps them attached.
 * @param gapText Source text between adjacent nodes.
 * @returns True when the gap contains no blank line.
 * @example
 * ```typescript
 * const ok = isAttachedLeadingGap("\n");
 * void ok;
 * ```
 */
function isAttachedLeadingGap(gapText: string): boolean {
  return (
    /^[\t \r\n]*$/u.test(gapText) && !/(?:\r?\n)[\t ]*(?:\r?\n)/u.test(gapText)
  );
}

/**
 * Converts one top-level statement into a declaration when supported.
 * @param statement Candidate statement.
 * @param sourceCode Source code wrapper used to inspect attached comments.
 * @returns Declaration when statement matches the rule shape.
 * @example
 * ```typescript
 * const declaration = toDeclaration({ type: "EmptyStatement" } as never);
 * void declaration;
 * ```
 */
function toDeclaration(
  statement: ESTree.Program["body"][number],
  sourceCode?: Rule.RuleContext["sourceCode"],
): Declaration | undefined {
  if (statement.type !== "VariableDeclaration" || statement.kind !== "const") {
    return void 0;
  }
  if (!hasRange(statement) || statement.declarations.length !== 1) {
    return void 0;
  }

  const [declarator] = statement.declarations;
  if (
    declarator === void 0 ||
    declarator.id.type !== "Identifier" ||
    !hasRange(declarator.id) ||
    declarator.init === null ||
    declarator.init === void 0 ||
    !hasRange(declarator.init) ||
    !isViFunctionCall(declarator.init)
  ) {
    return void 0;
  }

  return {
    declarationIdRange: declarator.id.range,
    initializerRange: declarator.init.range,
    localName: declarator.id.name,
    statementRange: getRemovalRange(statement, sourceCode),
  };
}

export { collectDeclarations };
