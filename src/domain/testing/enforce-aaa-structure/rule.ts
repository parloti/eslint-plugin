import type { Rule } from "eslint";

import type { SectionComment, TestBlockAnalysis } from "../aaa/types";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import { analyzeTestBlock } from "../aaa/analyzer.analysis";
import {
  aaaPhaseOrder,
  getFlattenedSections,
  getLineStartRange,
  getPhaseBoundaryComments,
} from "../aaa/analyzer.analysis.helpers";
import { hasBlankLineBeforeComment } from "../aaa/analyzer.classification.helpers";
import { reportPhasePurityViolations } from "../enforce-aaa-phase-purity/phase-purity-reporting";
import { buildMissingSectionFixes } from "./missing-section-fixes";

/** Flattened section entry emitted by the AAA analyzer helper. */
type FlattenedSection = ReturnType<typeof getFlattenedSections>[number];

/** Union of valid AAA phase labels emitted for flattened sections. */
type FlattenedSectionPhase = FlattenedSection["phase"];

/** Composite input for reporting one AAA section issue. */
interface ReportSectionIssueInput {
  /** Active ESLint rule context. */
  context: Rule.RuleContext;

  /** Message identifier to report for the section. */
  messageId: "duplicateSection" | "invalidOrder";

  /** Section comment and phase metadata under inspection. */
  section: FlattenedSection;
}

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
 * Reports a duplicate or out-of-order AAA section comment.
 * @param input Composite reporting input for the current section.
 * @example
 * ```typescript
 * reportSectionIssue({
 *   context: {} as Rule.RuleContext,
 *   messageId: "duplicateSection",
 *   section: {} as ReturnType<typeof getFlattenedSections>[number],
 * });
 * ```
 */
const reportSectionIssue = (input: ReportSectionIssueInput): void => {
  const { context, messageId, section } = input;

  context.report({
    data: { section: section.phase },
    messageId,
    node: section.comment,
  });
};

/**
 * Tracks the current AAA ordering state for one flattened section.
 * @param input Composite ordering state for the current section.
 * @returns Updated phase order watermark.
 * @example
 * ```typescript
 * const nextOrder = updateSectionOrder({
 *   context: {} as Rule.RuleContext,
 *   lastPhaseOrder: -1,
 *   section: {} as ReturnType<typeof getFlattenedSections>[number],
 *   seenPhases: new Set(),
 * });
 * void nextOrder;
 * ```
 */
const updateSectionOrder = (input: UpdateSectionOrderInput): number => {
  const { context, lastPhaseOrder, section, seenPhases } = input;

  if (seenPhases.has(section.phase)) {
    reportSectionIssue({ context, messageId: "duplicateSection", section });
    return lastPhaseOrder;
  }

  const currentPhaseOrder = aaaPhaseOrder[section.phase];
  if (currentPhaseOrder < lastPhaseOrder) {
    reportSectionIssue({ context, messageId: "invalidOrder", section });
  }

  seenPhases.add(section.phase);
  return Math.max(lastPhaseOrder, currentPhaseOrder);
};

/** Enforces a single Arrange/Act/Assert sequence inside supported test blocks. */
const enforceAaaStructureRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const analysis = analyzeTestBlock(context, node);
        if (analysis === void 0) {
          return;
        }

        const flattenedSections = getFlattenedSections(analysis);
        const seenPhases = new Set<FlattenedSectionPhase>();
        let lastPhaseOrder = -1;

        for (const section of flattenedSections) {
          lastPhaseOrder = updateSectionOrder({
            context,
            lastPhaseOrder,
            section,
            seenPhases,
          });
        }

        reportMissingSections(context, analysis);
        reportEmptySections(context, analysis);
        reportOutOfOrderSections(context, analysis);
        reportCodeBeforeArrange(context, analysis);
        reportBlankLineSeparators(context, analysis);
        reportPhasePurityViolations(context, analysis);
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: createRuleDocumentation(
      "enforce-aaa-structure",
      "Require explicit AAA markers, enforce section order and uniqueness, and keep setup, action, and assertions in their intended phases.",
    ),
    fixable: "code",
    messages: {
      actionInArrange:
        "Keep the function under test out of Arrange; reserve Arrange for setup only.",
      assertionOutsideAssert:
        "Move assertions into the // Assert section so test logic does not leak earlier.",
      asyncInArrange: "Do not trigger async behavior in Arrange.",
      awaitOutsideAct: "Use await only inside the // Act section.",
      blankLineBeforeSection:
        "Insert a blank line before the // {{section}} section comment.",
      codeBeforeArrange:
        "Move setup statements below the first // Arrange section comment.",
      duplicateSection:
        "Use the // {{section}} section comment only once per test.",
      emptySection:
        "The // {{section}} section must contain code; comments alone do not count.",
      invalidOrder:
        "Move the // {{section}} section comment so AAA phases stay in Arrange, Act, Assert order.",
      missingMeaningfulAct:
        "The // Act section must contain a meaningful SUT interaction, not only utility or setup calls.",
      missingSections: "Add the missing AAA section comments: {{sections}}.",
      mutationAfterAct:
        "Do not mutate test data after the // Act section has run.",
      nonAssertionInAssert:
        "Keep the // Assert section focused on assertions and assertion-local values.",
      outOfOrderSection:
        "The // {{section}} section comment appears out of order.",
      setupAfterAct:
        "Do not continue arranging test data after the // Act section has started.",
    },
    schema: [],
    type: "problem",
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
  const comments = analysis.sectionComments;
  const lastIndex = comments.length - 1;

  for (let index = 0; index < lastIndex; index += 1) {
    const previous = comments[index];
    const current = comments[index + 1];

    if (previous && current) reportIfOutOfOrder(context, previous, current);
  }
}

export { enforceAaaStructureRule };
