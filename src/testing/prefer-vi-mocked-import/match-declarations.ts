import type { Rule } from "eslint";
import type * as ESTree from "estree";

import type { Declaration } from "./types";

import { hasRange, isViFunctionCall } from "./match-helpers";

/**
 * Collects top-level `const x = vi.fn(...)` declarations.
 * @param program Program node.
 * @param sourceCode
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
    /**
     *
     */
    range: [number, number];
  },
  sourceCode?: Rule.RuleContext["sourceCode"],
): [number, number] {
  const statementStart = statement.range[0];
  const commentsBefore = sourceCode?.getCommentsBefore(statement) ?? [];

  if (commentsBefore.length === 0) {
    return statement.range;
  }

  let removalStart = statementStart;
  let nextStart = statementStart;

  for (const comment of [...commentsBefore].reverse()) {
    const commentRange = comment.range;

    if (commentRange === void 0) {
      break;
    }

    const gapText = sourceCode?.text.slice(commentRange[1], nextStart) ?? "";
    if (!isAttachedLeadingGap(gapText)) {
      break;
    }

    removalStart = commentRange[0];
    nextStart = commentRange[0];
  }

  return [removalStart, statement.range[1]];
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
    /^[\t \r\n]*$/u.test(gapText) && !/(\r?\n)[\t ]*(\r?\n)/u.test(gapText)
  );
}

/**
 * Converts one top-level statement into a declaration when supported.
 * @param statement Candidate statement.
 * @param sourceCode
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
