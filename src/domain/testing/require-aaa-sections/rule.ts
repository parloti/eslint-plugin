import type { Rule } from "eslint";

import type { SectionComment, TestBlockAnalysis } from "../aaa";

import {
  aaaPhaseOrder,
  analyzeTestBlock,
  getLineStartRange,
  getPhaseBoundaryComments,
  hasBlankLineBeforeComment,
} from "../aaa";
import { buildMissingSectionFixes } from "./missing-section-fixes";

/** Enforces explicit AAA section comments and spacing within supported test blocks. */
const requireAaaSectionsRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const analysis = analyzeTestBlock(context, node);
        if (analysis === void 0) {
          return;
        }

        reportMissingSections(context, analysis);
        reportEmptySections(context, analysis);
        reportOutOfOrderSections(context, analysis);
        reportCodeBeforeArrange(context, analysis);
        reportBlankLineSeparators(context, analysis);
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: {
      description:
        "Require strict // Arrange, // Act, and // Assert markers in supported test blocks.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/require-aaa-sections.md",
    },
    fixable: "code",
    messages: {
      blankLineBeforeSection:
        "Insert a blank line before the // {{section}} section comment.",
      codeBeforeArrange:
        "Move setup statements below the first // Arrange section comment.",
      emptySection:
        "The // {{section}} section must contain code; comments alone do not count.",
      missingSections: "Add the missing AAA section comments: {{sections}}.",
      outOfOrderSection:
        "The // {{section}} section comment appears out of order.",
    },
    schema: [],
    type: "layout",
  },
};

/**
 * Reports section comments that are missing a blank line above them.
 * @param context ESLint rule context.
 * @param analysis Parsed test-block analysis.
 * @example
 * ```typescript
 * reportBlankLineSeparators({ report() {} } as never, { sectionComments: [], sourceText: "" } as never);
 * ```
 */
function reportBlankLineSeparators(
  context: Rule.RuleContext,
  analysis: TestBlockAnalysis,
): void {
  const firstSectionComment = analysis.sectionComments[0]?.comment;

  for (const sectionComment of getPhaseBoundaryComments(analysis)) {
    if (
      sectionComment.comment !== firstSectionComment &&
      !hasBlankLineBeforeComment(analysis.sourceText, sectionComment.comment)
    ) {
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
}

/**
 * Reports executable statements that appear before the first Arrange section.
 * @param context ESLint rule context.
 * @param analysis Parsed test-block analysis.
 * @example
 * ```typescript
 * reportCodeBeforeArrange({ report() {} } as never, { sectionComments: [], statements: [] } as never);
 * ```
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
 * Reports Arrange sections that contain only comments or whitespace.
 * @param context ESLint rule context.
 * @param analysis Parsed test-block analysis.
 * @example
 * ```typescript
 * reportEmptySections({ report() {} } as never, { sectionComments: [], statements: [] } as never);
 * ```
 */
function reportEmptySections(
  context: Rule.RuleContext,
  analysis: TestBlockAnalysis,
): void {
  for (const [index, sectionComment] of analysis.sectionComments.entries()) {
    const nextSectionLine =
      analysis.sectionComments[index + 1]?.comment.loc.start.line;
    const hasCodeInSection = analysis.statements.some((statement) => {
      const statementLine = statement.node.loc.start.line;

      return (
        statementLine > sectionComment.comment.loc.start.line &&
        (nextSectionLine === void 0 || statementLine < nextSectionLine)
      );
    });

    if (!hasCodeInSection) {
      context.report({
        data: { section: sectionComment.phases.join(" & ") },
        messageId: "emptySection",
        node: sectionComment.comment,
      });
    }
  }
}

/**
 * Reports a single out-of-order section pair.
 * @param context ESLint rule context.
 * @param previous Previous section comment.
 * @param current Current section comment.
 * @example
 * ```typescript
 * reportIfOutOfOrder({ report() {} } as never, { comment: {} as never, phases: [] }, { comment: {} as never, phases: [] });
 * ```
 */
function reportIfOutOfOrder(
  context: Rule.RuleContext,
  previous: SectionComment,
  current: SectionComment,
): void {
  const maxPreviousOrder = Math.max(
    ...previous.phases.map((phase) => aaaPhaseOrder[phase]),
  );
  const minCurrentOrder = Math.min(
    ...current.phases.map((phase) => aaaPhaseOrder[phase]),
  );

  if (minCurrentOrder <= maxPreviousOrder) {
    context.report({
      data: { section: current.phases.join(" & ") },
      messageId: "outOfOrderSection",
      node: current.comment,
    });
  }
}

/**
 * Reports any AAA section markers that are missing from a supported test block.
 * @param context ESLint rule context.
 * @param analysis Parsed test-block analysis.
 * @example
 * ```typescript
 * reportMissingSections({ report() {} } as never, { sectionComments: [] } as never);
 * ```
 */
function reportMissingSections(
  context: Rule.RuleContext,
  analysis: TestBlockAnalysis,
): void {
  const presentSections = new Set(
    analysis.sectionComments.flatMap((sectionComment) => sectionComment.phases),
  );
  const hasPreSectionStatements = analysis.statements.some(
    (statement) => statement.phases.length === 0,
  );
  const missingSections = (["Arrange", "Act", "Assert"] as const).filter(
    (phase) =>
      !presentSections.has(phase) &&
      (phase !== "Arrange" || hasPreSectionStatements),
  );

  if (missingSections.length === 0) {
    return;
  }

  context.report({
    data: { sections: missingSections.join(", ") },
    fix:
      analysis.bodyLineCount >= 3
        ? (fixer: Rule.RuleFixer): Rule.Fix[] =>
            buildMissingSectionFixes(analysis, missingSections, fixer)
        : void 0,
    messageId: "missingSections",
    node: analysis.callExpression,
  });
}

/**
 * Reports section comments that appear out of canonical Arrange → Act → Assert order.
 * @param context ESLint rule context.
 * @param analysis Parsed test-block analysis.
 * @example
 * ```typescript
 * reportOutOfOrderSections({ report() {} } as never, { sectionComments: [] } as never);
 * ```
 */
function reportOutOfOrderSections(
  context: Rule.RuleContext,
  analysis: TestBlockAnalysis,
): void {
  const comments = analysis.sectionComments;
  const lastIndex = comments.length - 1;

  for (let index = 0; index < lastIndex; index += 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- loop bounds guarantee both indices exist
    const previous = comments[index]!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- loop bounds guarantee both indices exist
    const current = comments[index + 1]!;

    reportIfOutOfOrder(context, previous, current);
  }
}

export { requireAaaSectionsRule };
