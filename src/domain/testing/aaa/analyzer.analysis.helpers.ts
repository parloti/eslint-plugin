import type * as ESTree from "estree";

import type {
  AaaPhase,
  LocatedNode,
  SourceComment,
  TestBlockAnalysis,
} from "./types";

/** Canonical ordering used when comparing AAA phases. */
const aaaPhaseOrder = {
  Act: 1,
  Arrange: 0,
  Assert: 2,
} as const satisfies Record<AaaPhase, number>;

/** Recognized AAA phase names. */
const phaseNames = ["Arrange", "Act", "Assert"] as const satisfies readonly [
  AaaPhase,
  AaaPhase,
  AaaPhase,
];

/** Helper state for flattened section comments. */
interface FlattenedSection {
  /** Original source comment for the section marker. */
  comment: SourceComment;
  /** Phase represented by the flattened section entry. */
  phase: AaaPhase;
}

/** Supported call-expression wrapper for analyzed test blocks. */
interface SupportedTestCall {
  /** Callback argument that owns the test body. */
  callback: SupportedTestCallback;
  /** Original `it` or `test` invocation. */
  callExpression: LocatedNode<ESTree.CallExpression>;
}

/** Supported test callback shape for `it` and `test` calls. */
type SupportedTestCallback = LocatedNode<
  ESTree.ArrowFunctionExpression | ESTree.FunctionExpression
> & {
  /** Callback body block used for section analysis. */
  body: LocatedNode<ESTree.BlockStatement>;
};

/**
 * Counts Act statements.
 * @param analysis Input analysis value.
 * @returns Return value output.
 * @example
 * ```typescript
 * countActStatements(analysis);
 * ```
 */
function countActStatements(analysis: TestBlockAnalysis): number {
  return getActTopLevelStatements(analysis).length;
}

/**
 * Gets top-level statements that belong to the Act phase only.
 * @param analysis Input analysis value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getActTopLevelStatements(analysis);
 * ```
 */
function getActTopLevelStatements(
  analysis: Pick<TestBlockAnalysis, "statements">,
): TestBlockAnalysis["statements"] {
  return analysis.statements.filter(
    (statement) =>
      statement.phases.includes("Act") && !statement.phases.includes("Assert"),
  );
}

/**
 * Flattens section comments.
 * @param analysis Input analysis value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getFlattenedSections(analysis);
 * ```
 */
function getFlattenedSections(
  analysis: Pick<TestBlockAnalysis, "sectionComments">,
): FlattenedSection[] {
  return analysis.sectionComments.flatMap((sectionComment) =>
    sectionComment.phases.map((phase) => ({
      comment: sectionComment.comment,
      phase,
    })),
  );
}

/**
 * Gets the start range for a line.
 * @param sourceText Input sourceText value.
 * @param line Input line value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getLineStartRange(sourceText, 2);
 * ```
 */
function getLineStartRange(sourceText: string, line: number): [number, number] {
  let currentLine = 1;
  let currentOffset = 0;
  for (const character of sourceText) {
    if (currentLine === line) {
      return [currentOffset, currentOffset];
    }
    if (character === "\n") {
      currentLine += 1;
    }
    currentOffset += 1;
  }
  return [sourceText.length, sourceText.length];
}

/**
 * Gets the newline sequence.
 * @param text Input text value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getNewline(sourceText);
 * ```
 */
function getNewline(text: string): "\n" | "\r\n" {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * Gets phase-boundary comments.
 * @param analysis Input analysis value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getPhaseBoundaryComments(analysis);
 * ```
 */
function getPhaseBoundaryComments(
  analysis: Pick<TestBlockAnalysis, "sectionComments">,
): TestBlockAnalysis["sectionComments"] {
  return analysis.sectionComments.filter((sectionComment) =>
    sectionComment.phases.some(
      (phase) => phase === "Act" || phase === "Assert",
    ),
  );
}

/**
 * Parses AAA phases from a comment.
 * @param commentValue Input commentValue value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getSectionPhases("Arrange & Act");
 * ```
 */
function getSectionPhases(commentValue: string): AaaPhase[] {
  const trimmedComment = commentValue.trim();
  if (trimmedComment.length === 0) {
    return [];
  }
  const parts = trimmedComment.split(/\s*&\s*/u);
  return parts.every((part) => isAaaPhase(part)) ? parts : [];
}

/**
 * Gets the active phases for a statement.
 * @param statement Input statement value.
 * @param sectionComments Input sectionComments value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getStatementPhases(statement, sectionComments);
 * ```
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
 * Gets supported test call metadata.
 * @param node Input node value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getSupportedTestCall(node);
 * ```
 */
function getSupportedTestCall(
  node: ESTree.CallExpression,
): SupportedTestCall | undefined {
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
    callback: callbackArgument as SupportedTestCallback,
    callExpression: node as LocatedNode<ESTree.CallExpression>,
  };
}

/**
 * Gets the root test callee name.
 * @param callee Input callee value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getTestRootName(callExpression.callee);
 * ```
 */
function getTestRootName(
  callee: ESTree.CallExpression["callee"],
): string | undefined {
  let current: ESTree.CallExpression["callee"] = callee;

  while (
    current.type === "CallExpression" ||
    (current.type === "MemberExpression" && current.object.type !== "Super")
  ) {
    current =
      current.type === "CallExpression" ? current.callee : current.object;
  }

  if (current.type === "Identifier") {
    return current.name;
  }

  return void 0;
}

/**
 * Checks whether a value is an AAA phase.
 * @param value Input value value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isAaaPhase("Arrange");
 * ```
 */
function isAaaPhase(value: string): value is AaaPhase {
  return phaseNames.includes(value as AaaPhase);
}

/** Companion marker for test isolation. */
export {
  aaaPhaseOrder,
  countActStatements,
  getActTopLevelStatements,
  getFlattenedSections,
  getLineStartRange,
  getNewline,
  getPhaseBoundaryComments,
  getSectionPhases,
  getStatementPhases,
  getSupportedTestCall,
};
