import type { Rule } from "eslint";

import type { AaaPhase, TestBlockAnalysis } from "../aaa";

import { aaaPhaseOrder, getLineStartRange } from "../aaa";

/** Composite input for building one missing-section fix. */
interface MissingSectionFixInput {
  /** Parsed test-block analysis. */
  analysis: TestBlockAnalysis;

  /** ESLint fixer instance. */
  fixer: Rule.RuleFixer;

  /** Source offset where the section marker should be inserted. */
  offset: number;

  /** Missing phases that share the same insertion offset. */
  phases: readonly AaaPhase[];
}

/** Anchor statements used to place missing AAA section comments. */
interface StatementAnchors {
  /** First statement available for an Arrange insertion. */
  firstStatement: TestBlockAnalysis["statements"][number]["node"];

  /** Last statement available for an Assert insertion. */
  lastStatement: TestBlockAnalysis["statements"][number]["node"];

  /** Middle statement available for an Act insertion. */
  middleStatement: TestBlockAnalysis["statements"][number]["node"];
}

/**
 * Groups missing phases by insertion offset.
 * @param anchors Anchor statements available for insertion.
 * @param missingSections Missing AAA phases to insert.
 * @returns Map of source offsets to phases that should be inserted there.
 * @example
 * ```typescript
 * const anchorMap = buildAnchorMap({ firstStatement: { range: [0, 1] } as never, lastStatement: { range: [2, 3] } as never, middleStatement: { range: [1, 2] } as never }, ["Arrange"]);
 * void anchorMap;
 * ```
 */
function buildAnchorMap(
  anchors: StatementAnchors,
  missingSections: readonly AaaPhase[],
): Map<number, AaaPhase[]> {
  const anchorMap = new Map<number, AaaPhase[]>();

  for (const phase of missingSections) {
    const anchorNode = getAnchorNode(anchors, phase);
    const existing = anchorMap.get(anchorNode.range[0]) ?? [];

    existing.push(phase);
    anchorMap.set(anchorNode.range[0], existing);
  }

  return anchorMap;
}

/**
 * Builds one autofix that inserts missing section markers before a statement.
 * @param input Composite input for one missing-section fix.
 * @returns Fix that inserts the missing section marker text.
 * @example
 * ```typescript
 * const fix = buildMissingSectionFix({ analysis: { newline: "\n", sourceText: "value" } as never, fixer: {} as never, offset: 0, phases: ["Arrange"] });
 * void fix;
 * ```
 */
function buildMissingSectionFix(input: MissingSectionFixInput): Rule.Fix {
  const { analysis, fixer, offset, phases } = input;
  const sourceLines = analysis.sourceText.split(/\r\n|\n/u);
  const sortedPhases = phases.toSorted(
    (left, right) => aaaPhaseOrder[left] - aaaPhaseOrder[right],
  );
  const statementLine = analysis.sourceText
    .slice(0, offset)
    .split(/\r\n|\n/u).length;
  const lineStartRange = getLineStartRange(analysis.sourceText, statementLine);
  const [previousLine = ""] =
    statementLine > 1
      ? sourceLines.slice(statementLine - 2, statementLine - 1)
      : [];
  const needsLeadingBlankLine = shouldInsertLeadingBlankLine(
    sortedPhases,
    previousLine,
  );
  const [currentLine = ""] = sourceLines.slice(
    statementLine - 1,
    statementLine,
  );
  const indentation = getLineIndentation(currentLine);

  return fixer.insertTextBeforeRange(
    lineStartRange,
    `${needsLeadingBlankLine ? analysis.newline : ""}${indentation}// ${sortedPhases.join(" & ")}${analysis.newline}`,
  );
}

/**
 * Builds autofix edits for each missing AAA section marker.
 * @param analysis Parsed test-block analysis.
 * @param missingSections Missing AAA phases to insert.
 * @param fixer ESLint fixer instance.
 * @returns Fixes that add the missing section comments.
 * @example
 * ```typescript
 * const fixes = buildMissingSectionFixes({ newline: "\n", sourceText: "value" } as never, ["Arrange"], {} as never);
 * void fixes;
 * ```
 */
function buildMissingSectionFixes(
  analysis: TestBlockAnalysis,
  missingSections: readonly AaaPhase[],
  fixer: Rule.RuleFixer,
): Rule.Fix[] {
  const anchors = getSectionAnchors(analysis);

  if (anchors === void 0) {
    return [];
  }

  return [...buildAnchorMap(anchors, missingSections).entries()].map(
    ([offset, phases]) =>
      buildMissingSectionFix({ analysis, fixer, offset, phases }),
  );
}

/**
 * Selects the anchor statement used for one missing AAA phase.
 * @param anchors Anchor statements available for insertion.
 * @param phase Missing phase being inserted.
 * @returns Statement node used as the insertion anchor.
 * @example
 * ```typescript
 * const anchor = getAnchorNode({ firstStatement: {} as never, lastStatement: {} as never, middleStatement: {} as never }, "Arrange");
 * void anchor;
 * ```
 */
function getAnchorNode(
  anchors: StatementAnchors,
  phase: AaaPhase,
): StatementAnchors[keyof StatementAnchors] {
  switch (phase) {
    case "Act": {
      return anchors.middleStatement;
    }
    case "Arrange": {
      return anchors.firstStatement;
    }
    case "Assert": {
      return anchors.lastStatement;
    }
    default: {
      return anchors.lastStatement;
    }
  }
}

/**
 * Reads the indentation prefix from a source line.
 * @param lineText Source line text.
 * @returns Leading whitespace for the line.
 * @example
 * ```typescript
 * const indentation = getLineIndentation("  value");
 * void indentation;
 * ```
 */
function getLineIndentation(lineText: string): string {
  const trimmedLine = lineText.trimStart();

  return lineText.slice(0, lineText.length - trimmedLine.length);
}

/**
 * Selects the statement nodes used as insertion anchors for missing sections.
 * @param analysis Parsed test-block analysis.
 * @returns Anchor statements for Arrange, Act, and Assert insertion.
 * @example
 * ```typescript
 * const anchors = getSectionAnchors({ statements: [] } as never);
 * void anchors;
 * ```
 */
function getSectionAnchors(
  analysis: TestBlockAnalysis,
): StatementAnchors | undefined {
  const [firstStatementEntry] = analysis.statements;
  const middleStatementEntry =
    analysis.statements[
      Math.min(
        analysis.statements.length - 1,
        Math.floor(analysis.statements.length / 2),
      )
    ];
  const lastStatementEntry = analysis.statements.at(-1);

  if (
    firstStatementEntry === void 0 ||
    middleStatementEntry === void 0 ||
    lastStatementEntry === void 0
  ) {
    return void 0;
  }

  return {
    firstStatement: firstStatementEntry.node,
    lastStatement: lastStatementEntry.node,
    middleStatement: middleStatementEntry.node,
  };
}

/**
 * Determines whether a missing section insertion needs a blank line prefix.
 * @param phases Missing phases inserted at the same offset.
 * @param previousLine Source line immediately above the insertion point.
 * @returns Whether the inserted marker should start with a blank line.
 * @example
 * ```typescript
 * const actual = shouldInsertLeadingBlankLine(["Act"], "run();");
 * void actual;
 * ```
 */
function shouldInsertLeadingBlankLine(
  phases: readonly AaaPhase[],
  previousLine: string,
): boolean {
  return (
    phases.some((phase) => phase !== "Arrange") &&
    previousLine.trim().length > 0
  );
}

export { buildMissingSectionFixes };
