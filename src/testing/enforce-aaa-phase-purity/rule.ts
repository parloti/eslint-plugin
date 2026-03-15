import type { Rule } from "eslint";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import {
  analyzeTestBlock,
  hasAssertion,
  hasAsyncLogic,
  hasAwait,
  hasMutation,
  isMeaningfulActStatement,
  isSetupLikeStatement,
  isValidAssertStatement,
} from "../aaa";

const enforceAaaPhasePurityRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const analysis = analyzeTestBlock(context, node);
        if (analysis === void 0) {
          return;
        }

        const hasAllSections = ["Arrange", "Act", "Assert"].every((phase) =>
          analysis.sectionComments.some((sectionComment) =>
            sectionComment.phases.includes(phase as never),
          ),
        );
        if (!hasAllSections) {
          return;
        }

        let hasMeaningfulAct = false;

        for (const statement of analysis.statements) {
          if (statement.phase === "Arrange") {
            if (hasAssertion(statement.node)) {
              context.report({
                messageId: "assertionOutsideAssert",
                node: statement.node,
              });
            }
            if (hasAwait(statement.node)) {
              context.report({
                messageId: "awaitOutsideAct",
                node: statement.node,
              });
            }
            if (hasAsyncLogic(statement.node)) {
              context.report({
                messageId: "asyncInArrange",
                node: statement.node,
              });
            }
            if (isMeaningfulActStatement(statement.node)) {
              context.report({
                messageId: "actionInArrange",
                node: statement.node,
              });
            }
            continue;
          }

          if (statement.phase === "Act") {
            hasMeaningfulAct ||= isMeaningfulActStatement(statement.node);

            if (hasAssertion(statement.node)) {
              context.report({
                messageId: "assertionOutsideAssert",
                node: statement.node,
              });
            }
            if (isSetupLikeStatement(statement.node)) {
              context.report({
                messageId: "setupAfterAct",
                node: statement.node,
              });
            }
            continue;
          }

          if (statement.phase === "Assert") {
            if (hasAwait(statement.node)) {
              context.report({
                messageId: "awaitOutsideAct",
                node: statement.node,
              });
            }
            if (hasMutation(statement.node)) {
              context.report({
                messageId: "mutationAfterAct",
                node: statement.node,
              });
              continue;
            }
            if (!isValidAssertStatement(statement.node)) {
              context.report({
                messageId: "nonAssertionInAssert",
                node: statement.node,
              });
            }
          }
        }

        if (!hasMeaningfulAct) {
          context.report({
            messageId: "missingMeaningfulAct",
            node: analysis.callExpression,
          });
        }
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: createRuleDocumentation(
      "enforce-aaa-phase-purity",
      "Keep setup, action, and assertions inside their intended AAA phases.",
    ),
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
