import type { Rule } from "eslint";

import type { TestBlockAnalysis } from "../aaa/types";

/** Phase-purity state for one analyzed statement. */
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
 * Reports violations for statements that belong to both Act and Assert.
 * @param context ESLint rule context.
 * @param statement Statement entry to report against.
 * @param purityState Phase-purity state for the statement.
 * @example
 * ```typescript
 * reportActAndAssertStatement({ report() {} } as never, { node: {} as never, phases: [] }, {} as never);
 * ```
 */
function reportActAndAssertStatement(
  context: Rule.RuleContext,
  statement: TestBlockAnalysis["statements"][number],
  purityState: StatementPurityState,
): void {
  if (purityState.containsMutation) {
    context.report({ messageId: "mutationAfterAct", node: statement.node });
    return;
  }

  if (purityState.isSetupLike && !purityState.isMeaningfulActContent) {
    context.report({ messageId: "setupAfterAct", node: statement.node });
  }

  if (purityState.containsAssertion && !purityState.isValidAssert) {
    context.report({ messageId: "nonAssertionInAssert", node: statement.node });
  }
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
 * Reports violations for statements that belong to both Arrange and Act.
 * @param context ESLint rule context.
 * @param statement Statement entry to report against.
 * @param purityState Phase-purity state for the statement.
 * @example
 * ```typescript
 * reportArrangeAndActStatement({ report() {} } as never, { node: {} as never, phases: [] }, {} as never);
 * ```
 */
function reportArrangeAndActStatement(
  context: Rule.RuleContext,
  statement: TestBlockAnalysis["statements"][number],
  purityState: StatementPurityState,
): void {
  if (purityState.containsAssertion) {
    context.report({
      messageId: "assertionOutsideAssert",
      node: statement.node,
    });
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
  if (
    purityState.allowsArrange &&
    !purityState.allowsAct &&
    !purityState.allowsAssert
  ) {
    reportArrangeOnlyStatement(context, statement, purityState);
    return;
  }

  if (
    purityState.allowsAct &&
    !purityState.allowsArrange &&
    !purityState.allowsAssert
  ) {
    reportActOnlyStatement(context, statement, purityState);
    return;
  }

  if (
    purityState.allowsAssert &&
    !purityState.allowsAct &&
    !purityState.allowsArrange
  ) {
    reportAssertOnlyStatement(context, statement, purityState);
    return;
  }

  if (
    purityState.allowsArrange &&
    purityState.allowsAct &&
    !purityState.allowsAssert
  ) {
    reportArrangeAndActStatement(context, statement, purityState);
    return;
  }

  if (
    purityState.allowsAct &&
    purityState.allowsAssert &&
    !purityState.allowsArrange
  ) {
    reportActAndAssertStatement(context, statement, purityState);
    return;
  }

  if (
    purityState.allowsArrange &&
    purityState.allowsAct &&
    purityState.allowsAssert &&
    purityState.containsAssertion &&
    !purityState.isValidAssert
  ) {
    context.report({ messageId: "nonAssertionInAssert", node: statement.node });
  }
}

export type { StatementPurityState };
export { reportStatementViolations };
