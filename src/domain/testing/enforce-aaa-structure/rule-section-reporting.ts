import type { Rule } from "eslint";

import type { getFlattenedSections } from "../aaa/analyzer.analysis.helpers";
import type { TestBlockAnalysis } from "../aaa/types";

import {
  aaaPhaseOrder,
  getLineStartRange,
  getPhaseBoundaryComments,
} from "../aaa/analyzer.analysis.helpers";
import { hasBlankLineBeforeComment } from "../aaa/analyzer.classification.helpers";
import { buildMissingSectionFixes } from "./missing-section-fixes";

/** Flattened section entry emitted by the AAA analyzer helper. */
type FlattenedSection = ReturnType<typeof getFlattenedSections>[number];

/** Union of valid AAA phase labels emitted for flattened sections. */
type FlattenedSectionPhase = FlattenedSection["phase"];

/** Composite input for advancing the AAA section ordering state. */
interface UpdateSectionOrderInput {
  /** Active ESLint rule context. */
  context: Rule.RuleContext;

  /** Highest phase order seen so far. */
  lastPhaseOrder: number;

  /** Section comment and phase metadata under inspection. */
  section: FlattenedSection;

  /** Set of phases already seen in the current test block. */
  seenPhases: Set<FlattenedSectionPhase>;
}

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
      sectionComment.comment === firstSectionComment ||
      hasBlankLineBeforeComment(analysis.sourceText, sectionComment.comment)
    ) {
      continue;
    }

    const fix = (fixer: Rule.RuleFixer): Rule.Fix =>
      fixer.insertTextBeforeRange(
        getLineStartRange(
          analysis.sourceText,
          sectionComment.comment.loc.start.line,
        ),
        analysis.newline,
      );

    context.report({
      data: { section: sectionComment.phases.join(" & ") },
      fix,
      messageId: "blankLineBeforeSection",
      node: sectionComment.comment,
      suggest: [{ fix, messageId: "addBlankLineBeforeSection" }],
    });
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
 * Reports sections that contain only comments or whitespace.
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

  const fix =
    analysis.bodyLineCount >= 3
      ? (fixer: Rule.RuleFixer): Rule.Fix[] =>
          buildMissingSectionFixes(analysis, missingSections, fixer)
      : void 0;

  context.report({
    data: { sections: missingSections.join(", ") },
    ...(fix !== void 0 && { fix }),
    messageId: "missingSections",
    node: analysis.callExpression,
    ...(fix !== void 0 && {
      suggest: [{ fix, messageId: "addMissingSections" }],
    }),
  });
}

/**
 * Reports section comments that appear out of canonical Arrange -> Act -> Assert order.
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
  for (let index = 0; index < analysis.sectionComments.length - 1; index += 1) {
    const previous = analysis.sectionComments[index];
    const current = analysis.sectionComments[index + 1];

    if (previous === void 0 || current === void 0) {
      continue;
    }

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
}

/**
 * Tracks the current AAA ordering state for one flattened section.
 * @param input Composite ordering state for the current section.
 * @returns Updated phase order watermark.
 * @example
 * ```typescript
 * const nextOrder = updateSectionOrder({ context: {} as Rule.RuleContext, lastPhaseOrder: -1, section: {} as never, seenPhases: new Set() });
 * ```
 */
const updateSectionOrder = (input: UpdateSectionOrderInput): number => {
  const { context, lastPhaseOrder, section, seenPhases } = input;

  if (seenPhases.has(section.phase)) {
    context.report({
      data: { section: section.phase },
      messageId: "duplicateSection",
      node: section.comment,
    });
    return lastPhaseOrder;
  }

  const currentPhaseOrder = aaaPhaseOrder[section.phase];
  if (currentPhaseOrder < lastPhaseOrder) {
    context.report({
      data: { section: section.phase },
      messageId: "invalidOrder",
      node: section.comment,
    });
  }

  seenPhases.add(section.phase);
  return Math.max(lastPhaseOrder, currentPhaseOrder);
};

export type { FlattenedSectionPhase };
export {
  reportBlankLineSeparators,
  reportCodeBeforeArrange,
  reportEmptySections,
  reportMissingSections,
  reportOutOfOrderSections,
  updateSectionOrder,
};
