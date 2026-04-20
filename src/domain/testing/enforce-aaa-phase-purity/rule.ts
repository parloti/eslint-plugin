import type { Rule } from "eslint";

import { analyzeTestBlock } from "../aaa";
import { reportPhasePurityViolations } from "./phase-purity-reporting";

/** Enforces pure Arrange, Act, and Assert behavior inside AAA-marked tests. */
const enforceAaaPhasePurityRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const analysis = analyzeTestBlock(context, node);
        if (analysis === void 0) {
          return;
        }
        reportPhasePurityViolations(context, analysis);
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: {
      description:
        "Keep setup, action, and assertions inside their intended AAA phases.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/enforce-aaa-phase-purity.md",
    },
    messages: {
      actionInArrange:
        "Keep the function under test out of Arrange; reserve Arrange for setup only.",
      assertionOutsideAssert:
        "Move assertions into the // Assert section so test logic does not leak earlier.",
      asyncInArrange: "Do not trigger async behavior in Arrange.",
      awaitOutsideAct: "Use await only inside the // Act section.",
      missingMeaningfulAct:
        "The // Act section must contain a meaningful SUT interaction, not only utility or setup calls.",
      mutationAfterAct:
        "Do not mutate test data after the // Act section has run.",
      nonAssertionInAssert:
        "Keep the // Assert section focused on assertions and assertion-local values.",
      setupAfterAct:
        "Do not continue arranging test data after the // Act section has started.",
    },
    schema: [],
    type: "problem",
  },
};

export { enforceAaaPhasePurityRule };
