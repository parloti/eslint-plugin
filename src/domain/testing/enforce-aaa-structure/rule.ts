import type { Rule } from "eslint";

import { analyzeTestBlock } from "../aaa/analyzer.analysis";
import {
  aaaPhaseOrder,
  getFlattenedSections,
} from "../aaa/analyzer.analysis.helpers";

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
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: {
      description:
        "Require AAA sections to appear once and in Arrange, Act, Assert order.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/enforce-aaa-structure.md",
    },
    messages: {
      duplicateSection:
        "Use the // {{section}} section comment only once per test.",
      invalidOrder:
        "Move the // {{section}} section comment so AAA phases stay in Arrange, Act, Assert order.",
    },
    schema: [],
    type: "problem",
  },
};

export { enforceAaaStructureRule };
