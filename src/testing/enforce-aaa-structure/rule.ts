import type { Rule } from "eslint";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import { aaaPhaseOrder, analyzeTestBlock, getFlattenedSections } from "../aaa";

/**
 *
 */
const enforceAaaStructureRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const analysis = analyzeTestBlock(context, node);
        if (analysis === void 0) {
          return;
        }

        const flattenedSections = getFlattenedSections(analysis);
        const seenPhases = new Set<string>();
        let lastPhaseOrder = -1;

        for (const section of flattenedSections) {
          if (seenPhases.has(section.phase)) {
            context.report({
              data: { section: section.phase },
              messageId: "duplicateSection",
              node: section.comment,
            });
            continue;
          }

          const currentPhaseOrder = aaaPhaseOrder[section.phase];
          if (currentPhaseOrder < lastPhaseOrder) {
            context.report({
              data: { section: section.phase },
              messageId: "invalidOrder",
              node: section.comment,
            });
          }

          lastPhaseOrder = Math.max(lastPhaseOrder, currentPhaseOrder);
          seenPhases.add(section.phase);
        }
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: createRuleDocumentation(
      "enforce-aaa-structure",
      "Require AAA sections to appear once and in Arrange, Act, Assert order.",
    ),
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
