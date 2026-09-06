import type { Rule } from "eslint";

import { reportPhasePurityViolations } from "../phase-purity-reporting";

/** Captured result of one context.report invocation. */
interface MessageCall {
  /** Reported message identifier. */
  messageId: string | undefined;
}

/** Flag payload passed through mocked analyzer helpers. */
interface NodeFlags {
  /** Whether a statement contains an assertion. */
  containsAssertion?: boolean;

  /** Whether a statement includes async control flow. */
  containsAsyncLogic?: boolean;

  /** Whether a statement contains an await expression. */
  containsAwait?: boolean;

  /** Whether a statement mutates state. */
  containsMutation?: boolean;

  /** Whether a statement exposes a capturable Act result. */
  hasCapturableActResult?: boolean;

  /** Whether Act output is asserted later in the test. */
  isActResultAsserted?: boolean;

  /** Whether a statement counts as meaningful Act work. */
  isMeaningfulAct?: boolean;

  /** Whether a statement appears to be setup-only logic. */
  isSetupLike?: boolean;

  /** Whether an assertion call is considered valid for Assert. */
  isValidAssert?: boolean;

  /** Statement node type for fixture analysis. */
  type: string;
}

/** Supported AAA section names in the fixture payload. */
type PhaseName = "Act" | "Arrange" | "Assert";

/** Section comment fixture used by analysis setup. */
interface SectionCommentFixture {
  /** Section phases represented by one section comment. */
  phases: PhaseName[];
}

/** Statement fixture consumed by phase-purity reporting. */
interface StatementFixture {
  /** Statement node analyzed by mock helper functions. */
  node: NodeFlags;

  /** AAA phases assigned to the statement. */
  phases: PhaseName[];
}

/**
 * Runs reporting and returns emitted message identifiers.
 * @param analysis Analysis fixture passed to the reporter.
 * @returns Ordered message identifiers collected from context.report.
 * @example
 * ```typescript
 * const messageIds = collectMessageIds(createAnalysis([]));
 * ```
 */
const collectMessageIds = (analysis: unknown): string[] => {
  const calls: MessageCall[] = [];
  const context = {
    report: (descriptor: Rule.ReportDescriptor): void => {
      calls.push({
        messageId: "messageId" in descriptor ? descriptor.messageId : void 0,
      });
    },
  } as Rule.RuleContext;

  reportPhasePurityViolations(context, analysis as never);
  return calls.map((call) => call.messageId ?? "<missing>");
};

/**
 * Builds a minimal analysis object accepted by reportPhasePurityViolations.
 * @param statements Statement fixtures to analyze.
 * @param sectionPhases Section phases declared in the test block.
 * @returns Fixture payload for phase-purity reporting.
 * @example
 * ```typescript
 * const analysis = createAnalysis([{ node: { type: "ExpressionStatement" }, phases: ["Act"] }]);
 * ```
 */
const createAnalysis = (
  statements: StatementFixture[],
  sectionPhases: PhaseName[] = ["Act", "Assert"],
) =>
  ({
    callExpression: { type: "CallExpression" },
    sectionComments: sectionPhases.map(
      (phase) => ({ phases: [phase] }) satisfies SectionCommentFixture,
    ),
    statements,
  }) as never;

/**
 * Checks whether one named flag is enabled on a fixture node.
 * @param node Statement fixture node.
 * @param key Flag key to evaluate.
 * @returns True when the flag is explicitly true.
 * @example
 * ```typescript
 * const value = hasFlag({ type: "ExpressionStatement" }, "containsAwait");
 * ```
 */
const hasFlag = (node: NodeFlags, key: keyof NodeFlags): boolean =>
  node[key] === true;

export type { NodeFlags };
export { collectMessageIds, createAnalysis, hasFlag };
