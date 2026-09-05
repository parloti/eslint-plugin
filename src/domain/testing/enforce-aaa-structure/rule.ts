import type { Rule } from "eslint";

import type { FlattenedSectionPhase } from "./rule-section-reporting";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import { analyzeTestBlock } from "../aaa/analyzer.analysis";
import { getFlattenedSections } from "../aaa/analyzer.analysis.helpers";
import { reportPhasePurityViolations } from "../enforce-aaa-phase-purity/phase-purity-reporting";
import {
  reportBlankLineSeparators,
  reportCodeBeforeArrange,
  reportEmptySections,
  reportMissingSections,
  reportOutOfOrderSections,
  updateSectionOrder,
} from "./rule-section-reporting";

/** Enforces a single Arrange/Act/Assert sequence inside supported test blocks. */
const enforceAaaStructureRule: Rule.RuleModule = {
  create: (context: Rule.RuleContext): Rule.RuleListener =>
    ({
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
    }) satisfies Rule.RuleListener,
  meta: {
    docs: createRuleDocumentation(
      "enforce-aaa-structure",
      "Require explicit AAA markers, enforce section order and uniqueness, and keep setup, action, and assertions in their intended phases.",
    ),
    fixable: "code",
    hasSuggestions: true,
    messages: {
      actionInArrange:
        "Keep the function under test out of Arrange; reserve Arrange for setup only.",
      addBlankLineBeforeSection:
        "Insert a blank line before the // {{section}} section comment.",
      addMissingSections: "Add the missing AAA section comments: {{sections}}.",
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

export { enforceAaaStructureRule };
