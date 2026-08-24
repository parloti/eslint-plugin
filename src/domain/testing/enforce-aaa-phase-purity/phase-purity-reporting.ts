import type { Rule } from "eslint";

import type { TestBlockAnalysis } from "../aaa/types";
import type { StatementPurityState } from "./statement-purity-reporters";

import {
  hasAssertion,
  isValidAssertStatement,
} from "../aaa/analyzer.assertions.helpers";
import {
  hasAsyncLogic,
  hasAwait,
  hasCapturableActResult,
  hasMutation,
  isMeaningfulActStatement,
  isSetupLikeStatement,
} from "../aaa/analyzer.classification.helpers";
import {
  getAssertReferencedIdentifiers,
  isActResultAsserted,
} from "./phase-purity-identifiers";
import { reportStatementViolations } from "./statement-purity-reporters";

/**
 * Collects the phase-purity state for one analyzed statement.
 * @param assertReferencedIdentifiers Referenced identifiers collected from Assert.
 * @param statement Statement entry to classify.
 * @returns Phase-purity state for the statement.
 * @example
 * ```typescript
 * const state = getStatementPurityState(new Set<string>(), { node: { type: "ExpressionStatement" } as never, phases: [] });
 * void state;
 * ```
 */
function getStatementPurityState(
  assertReferencedIdentifiers: Set<string>,
  statement: TestBlockAnalysis["statements"][number],
): StatementPurityState {
  const allowsArrange = statement.phases.includes("Arrange");
  const allowsAct = statement.phases.includes("Act");
  const allowsAssert = statement.phases.includes("Assert");
  const containsAssertion = hasAssertion(statement.node);
  const containsAsyncLogic = hasAsyncLogic(statement.node);
  const containsAwait = hasAwait(statement.node);
  const containsMutation = hasMutation(statement.node);
  const isMeaningfulAct = isMeaningfulActStatement(statement.node);
  const isMeaningfulActContent =
    isMeaningfulAct ||
    hasCapturableActResult(statement.node) ||
    isActResultAsserted(assertReferencedIdentifiers, statement.node);

  return {
    allowsAct,
    allowsArrange,
    allowsAssert,
    containsAssertion,
    containsAsyncLogic,
    containsAwait,
    containsMutation,
    isMeaningfulAct,
    isMeaningfulActContent,
    isSetupLike: isSetupLikeStatement(statement.node),
    isValidAssert: isValidAssertStatement(statement.node),
  };
}

/**
 * Checks whether the analyzed test block declares the Act and Assert sections.
 * @param analysis Parsed test-block analysis.
 * @returns True when Act and Assert are both present.
 * @example
 * ```typescript
 * const complete = hasRequiredAaaSections({ sectionComments: [] } as never);
 * void complete;
 * ```
 */
function hasRequiredAaaSections(analysis: TestBlockAnalysis): boolean {
  return ["Act", "Assert"].every((phase) =>
    analysis.sectionComments.some((sectionComment) =>
      sectionComment.phases.includes(phase as never),
    ),
  );
}

/**
 * Reports all enforce-aaa-phase-purity violations for one test block.
 * @param context ESLint rule context.
 * @param analysis Parsed test-block analysis.
 * @example
 * ```typescript
 * reportPhasePurityViolations({ report() {} } as never, { sectionComments: [], statements: [] } as never);
 * ```
 */
function reportPhasePurityViolations(
  context: Rule.RuleContext,
  analysis: TestBlockAnalysis,
): void {
  if (!hasRequiredAaaSections(analysis)) {
    return;
  }

  let hasMeaningfulAct = false;
  const assertReferencedIdentifiers = getAssertReferencedIdentifiers(analysis);

  for (const statement of analysis.statements) {
    const purityState = getStatementPurityState(
      assertReferencedIdentifiers,
      statement,
    );

    hasMeaningfulAct ||=
      purityState.allowsAct && purityState.isMeaningfulActContent;
    reportStatementViolations(context, statement, purityState);
  }

  if (!hasMeaningfulAct) {
    context.report({
      messageId: "missingMeaningfulAct",
      node: analysis.callExpression,
    });
  }
}

export { reportPhasePurityViolations };
