import type { Rule } from "eslint";

import type { AaaPhase, TestBlockAnalysis } from "../aaa";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import {
  aaaPhaseOrder,
  analyzeTestBlock,
  getIndentationAtOffset,
  getLineStartRange,
  getPhaseBoundaryComments,
  hasBlankLineBeforeComment,
} from "../aaa";

/**
 *
 */
const requireAaaSectionsRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const analysis = analyzeTestBlock(context, node);
        if (analysis === void 0) {
          return;
        }

        reportMissingSections(context, analysis);
        reportCodeBeforeArrange(context, analysis);
        reportBlankLineSeparators(context, analysis);
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: createRuleDocumentation(
      "require-aaa-sections",
      "Require strict // Arrange, // Act, and // Assert markers in supported test blocks.",
    ),
    fixable: "code",
    messages: {
      blankLineBeforeSection:
        "Insert a blank line before the // {{section}} section comment.",
      codeBeforeArrange:
        "Move setup statements below the first // Arrange section comment.",
      missingSections: "Add the missing AAA section comments: {{sections}}.",
    },
    schema: [],
    type: "layout",
  },
};

/**
 * @param analysis
 * @param missingSections
 * @param fixer
 * @example
 */
function buildMissingSectionFixes(
  analysis: TestBlockAnalysis,
  missingSections: readonly AaaPhase[],
  fixer: Rule.RuleFixer,
): Rule.Fix[] {
  if (analysis.statements.length === 0) {
    return [];
  }

  const anchorMap = new Map<number, AaaPhase[]>();
  const sourceLines = analysis.sourceText.split(/\r\n|\n/u);
  const firstStatement = analysis.statements[0]!.node;
  const middleStatement =
    analysis.statements[
      Math.min(
        analysis.statements.length - 1,
        Math.floor(analysis.statements.length / 2),
      )
    ]!.node;
  const lastStatement = analysis.statements.at(-1)!.node;

  for (const phase of missingSections) {
    const anchorNode =
      phase === "Arrange"
        ? firstStatement
        : phase === "Act"
          ? middleStatement
          : lastStatement;

    const existing = anchorMap.get(anchorNode.range[0]) ?? [];
    existing.push(phase);
    anchorMap.set(anchorNode.range[0], existing);
  }

  return [...anchorMap.entries()].map(([offset, phases]) => {
    const sortedPhases = phases.toSorted(
      (left, right) => aaaPhaseOrder[left] - aaaPhaseOrder[right],
    );
    const statementLine = analysis.sourceText
      .slice(0, offset)
      .split(/\r\n|\n/u).length;
    const previousLine = sourceLines[statementLine - 2]!;
    const lineStartRange = getLineStartRange(
      analysis.sourceText,
      statementLine,
    );
    const needsLeadingBlankLine =
      sortedPhases.some((phase) => phase !== "Arrange") &&
      previousLine.trim().length > 0;
    const indentation = /^\s*/u.exec(sourceLines[statementLine - 1]!)![0];

    return fixer.insertTextBeforeRange(
      lineStartRange,
      `${needsLeadingBlankLine ? analysis.newline : ""}${indentation}// ${sortedPhases.join(" & ")}${analysis.newline}`,
    );
  });
}

/**
 * @param context
 * @param analysis
 * @example
 */
function reportBlankLineSeparators(
  context: Rule.RuleContext,
  analysis: TestBlockAnalysis,
): void {
  for (const sectionComment of getPhaseBoundaryComments(analysis)) {
    if (
      hasBlankLineBeforeComment(analysis.sourceText, sectionComment.comment)
    ) {
      continue;
    }

    context.report({
      data: { section: sectionComment.phases.join(" & ") },
      fix: (fixer) =>
        fixer.insertTextBeforeRange(
          getLineStartRange(
            analysis.sourceText,
            sectionComment.comment.loc.start.line,
          ),
          analysis.newline,
        ),
      messageId: "blankLineBeforeSection",
      node: sectionComment.comment,
    });
  }
}

/**
 * @param context
 * @param analysis
 * @example
 */
function reportCodeBeforeArrange(
  context: Rule.RuleContext,
  analysis: TestBlockAnalysis,
): void {
  const firstArrangeLine = analysis.sectionComments.find((sectionComment) =>
    sectionComment.phases.includes("Arrange"),
  )?.comment.loc.start.line;
  if (firstArrangeLine === void 0) {
    return;
  }

  const statementBeforeArrange = analysis.statements.find(
    (statement) => statement.node.loc.start.line < firstArrangeLine,
  );
  if (statementBeforeArrange === void 0) {
    return;
  }

  context.report({
    messageId: "codeBeforeArrange",
    node: statementBeforeArrange.node,
  });
}

/**
 * @param context
 * @param analysis
 * @example
 */
function reportMissingSections(
  context: Rule.RuleContext,
  analysis: TestBlockAnalysis,
): void {
  const presentSections = new Set(
    analysis.sectionComments.flatMap((sectionComment) => sectionComment.phases),
  );
  const missingSections = (["Arrange", "Act", "Assert"] as const).filter(
    (phase) => !presentSections.has(phase),
  );

  if (missingSections.length === 0) {
    return;
  }

  context.report({
    data: { sections: missingSections.join(", ") },
    fix:
      analysis.bodyLineCount >= 3
        ? (fixer) => buildMissingSectionFixes(analysis, missingSections, fixer)
        : null,
    messageId: "missingSections",
    node: analysis.callExpression,
  });
}

export { requireAaaSectionsRule };
