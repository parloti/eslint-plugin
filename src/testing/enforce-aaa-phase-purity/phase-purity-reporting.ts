import type { Rule } from "eslint";

import type { TestBlockAnalysis } from "../aaa";

import {
  hasAssertion,
  hasAsyncLogic,
  hasAwait,
  hasCapturableActResult,
  hasMutation,
  isMeaningfulActStatement,
  isSetupLikeStatement,
  isValidAssertStatement,
} from "../aaa";
import {
  getAssertReferencedIdentifiers,
  isActResultAsserted,
} from "./phase-purity-identifiers";

/** Type definition for rule data. */
interface StatementPurityState {
  /** Whether the statement belongs to Act. */
  allowsAct: boolean;

  /** Whether the statement belongs to Arrange. */
  allowsArrange: boolean;

  /** Whether the statement belongs to Assert. */
  allowsAssert: boolean;

  /** Whether the statement contains an assertion. */
  containsAssertion: boolean;

  /** Whether the statement contains async logic. */
  containsAsyncLogic: boolean;

  /** Whether the statement contains an await expression. */
  containsAwait: boolean;

  /** Whether the statement mutates state. */
  containsMutation: boolean;

  /** Whether the statement performs meaningful Act work. */
  isMeaningfulAct: boolean;

  /** Whether the statement counts as meaningful Act content overall. */
  isMeaningfulActContent: boolean;

  /** Whether the statement looks like setup. */
  isSetupLike: boolean;

  /** Whether the statement is a valid assert-phase statement. */
  isValidAssert: boolean;
}

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
 * Checks whether the analyzed test block declares all AAA section comments.
 * @param analysis Parsed test-block analysis.
 * @returns True when Arrange, Act, and Assert are all present.
 * @example
 * ```typescript
 * const complete = hasAllAaaSections({ sectionComments: [] } as never);
 * void complete;
 * ```
 */
function hasAllAaaSections(analysis: TestBlockAnalysis): boolean {
  return ["Arrange", "Act", "Assert"].every((phase) =>
    analysis.sectionComments.some((sectionComment) =>
      sectionComment.phases.includes(phase as never),
    ),
  );
}

/**
 * Reports Act-only phase violations for one statement.
 * @param context ESLint rule context.
 * @param statement Statement entry to report against.
 * @param purityState Phase-purity state for the statement.
 * @example
 * ```typescript
 * reportActOnlyStatement({ report() {} } as never, { node: {} as never, phases: [] }, {} as never);
 * ```
 */
function reportActOnlyStatement(
  context: Rule.RuleContext,
  statement: TestBlockAnalysis["statements"][number],
  purityState: StatementPurityState,
): void {
  if (purityState.containsAssertion && !purityState.allowsAssert) {
    context.report({
      messageId: "assertionOutsideAssert",
      node: statement.node,
    });
  }

  if (purityState.isSetupLike && !purityState.isMeaningfulActContent) {
    context.report({ messageId: "setupAfterAct", node: statement.node });
  }
}

/**
 * Reports Arrange-only phase violations for one statement.
 * @param context ESLint rule context.
 * @param statement Statement entry to report against.
 * @param purityState Phase-purity state for the statement.
 * @example
 * ```typescript
 * reportArrangeOnlyStatement({ report() {} } as never, { node: {} as never, phases: [] }, {} as never);
 * ```
 */
function reportArrangeOnlyStatement(
  context: Rule.RuleContext,
  statement: TestBlockAnalysis["statements"][number],
  purityState: StatementPurityState,
): void {
  if (purityState.containsAssertion && !purityState.allowsAssert) {
    context.report({
      messageId: "assertionOutsideAssert",
      node: statement.node,
    });
  }

  if (purityState.containsAwait) {
    context.report({ messageId: "awaitOutsideAct", node: statement.node });
  }

  if (purityState.containsAsyncLogic) {
    context.report({ messageId: "asyncInArrange", node: statement.node });
  }

  if (purityState.isMeaningfulAct) {
    context.report({ messageId: "actionInArrange", node: statement.node });
  }
}

/**
 * Reports Assert-only phase violations for one statement.
 * @param context ESLint rule context.
 * @param statement Statement entry to report against.
 * @param purityState Phase-purity state for the statement.
 * @example
 * ```typescript
 * reportAssertOnlyStatement({ report() {} } as never, { node: {} as never, phases: [] }, {} as never);
 * ```
 */
function reportAssertOnlyStatement(
  context: Rule.RuleContext,
  statement: TestBlockAnalysis["statements"][number],
  purityState: StatementPurityState,
): void {
  if (purityState.containsAwait) {
    context.report({ messageId: "awaitOutsideAct", node: statement.node });
  }

  if (purityState.containsMutation) {
    context.report({ messageId: "mutationAfterAct", node: statement.node });
    return;
  }

  if (!purityState.isValidAssert) {
    context.report({ messageId: "nonAssertionInAssert", node: statement.node });
  }
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
  if (!hasAllAaaSections(analysis)) {
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

/**
 * Reports any phase-purity violations for one statement.
 * @param context ESLint rule context.
 * @param statement Statement entry to report against.
 * @param purityState Phase-purity state for the statement.
 * @example
 * ```typescript
 * reportStatementViolations({ report() {} } as never, { node: {} as never, phases: [] }, {} as never);
 * ```
 */
function reportStatementViolations(
  context: Rule.RuleContext,
  statement: TestBlockAnalysis["statements"][number],
  purityState: StatementPurityState,
): void {
  if (purityState.allowsArrange && !purityState.allowsAct) {
    reportArrangeOnlyStatement(context, statement, purityState);
    return;
  }

  if (purityState.allowsAct && !purityState.allowsArrange) {
    reportActOnlyStatement(context, statement, purityState);
    return;
  }

  if (purityState.allowsAssert && !purityState.allowsAct) {
    reportAssertOnlyStatement(context, statement, purityState);
  }
}

export { reportPhasePurityViolations };
