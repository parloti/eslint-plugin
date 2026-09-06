import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { TestBlockAnalysis } from "../aaa/types";
import type { StatementPurityState } from "./statement-purity-reporters";

import { reportStatementViolations } from "./statement-purity-reporters";

/** Context plus captured message identifiers for one reporting run. */
interface ReportedMessageIds {
  /** Mock ESLint rule context that records reports. */
  context: Rule.RuleContext;

  /** Message identifiers captured from context.report. */
  messageIds: string[];
}

/**
 * Builds a rule context that records reported message identifiers.
 * @returns Context and its captured message identifier list.
 * @example
 * ```typescript
 * const { context, messageIds } = createRecordingContext();
 * ```
 */
const createRecordingContext = (): ReportedMessageIds => {
  const messageIds: string[] = [];
  const context = {
    report: (descriptor: Rule.ReportDescriptor): void => {
      if ("messageId" in descriptor) {
        messageIds.push(descriptor.messageId);
      }
    },
  } as unknown as Rule.RuleContext;

  return { context, messageIds };
};

/**
 * Creates one statement fixture with the provided phases.
 * @param phases AAA phases assigned to the fixture statement.
 * @returns Statement fixture accepted by the reporters.
 * @example
 * ```typescript
 * const statement = createStatementFixture(["Arrange"]);
 * ```
 */
const createStatementFixture = (
  phases: string[],
): TestBlockAnalysis["statements"][number] =>
  ({ node: { type: "ExpressionStatement" }, phases }) as never;

/**
 * Creates a phase-purity state with sensible defaults.
 * @param overrides Flag values that differ from the defaults.
 * @returns Phase-purity state for reporter dispatch.
 * @example
 * ```typescript
 * const purityState = createPurityState({ allowsAct: true });
 * ```
 */
const createPurityState = (
  overrides: Partial<StatementPurityState> = {},
): StatementPurityState => ({
  allowsAct: false,
  allowsArrange: false,
  allowsAssert: false,
  containsAssertion: false,
  containsAsyncLogic: false,
  containsAwait: false,
  containsMutation: false,
  isMeaningfulAct: false,
  isMeaningfulActContent: false,
  isSetupLike: false,
  isValidAssert: true,
  ...overrides,
});

/**
 * Reports violations for one statement and returns emitted message ids.
 * @param purityState Phase-purity state driving dispatch.
 * @param statement Statement fixture to report against.
 * @returns Ordered message identifiers emitted by the reporters.
 * @example
 * ```typescript
 * const messageIds = collectEmittedMessageIds(purityState, statement);
 * ```
 */
const collectEmittedMessageIds = (
  purityState: StatementPurityState,
  statement: TestBlockAnalysis["statements"][number],
): string[] => {
  const { context, messageIds } = createRecordingContext();

  reportStatementViolations(context, statement, purityState);
  return messageIds;
};

describe("enforce-aaa-phase-purity statement-purity-reporters", () => {
  it("reports every arrange-only violation", () => {
    // Arrange
    const purityState = createPurityState({
      allowsArrange: true,
      containsAssertion: true,
      containsAsyncLogic: true,
      containsAwait: true,
      isMeaningfulAct: true,
    });
    const statement = createStatementFixture(["Arrange"]);

    // Act
    const actualMessages = collectEmittedMessageIds(purityState, statement);

    // Assert
    expect(actualMessages).toStrictEqual([
      "assertionOutsideAssert",
      "awaitOutsideAct",
      "asyncInArrange",
      "actionInArrange",
    ]);
  });

  it("reports assertions outside Assert for act-only statements", () => {
    // Arrange
    const purityState = createPurityState({
      allowsAct: true,
      containsAssertion: true,
    });
    const statement = createStatementFixture(["Act"]);

    // Act
    const actualMessages = collectEmittedMessageIds(purityState, statement);

    // Assert
    expect(actualMessages).toStrictEqual(["assertionOutsideAssert"]);
  });

  it("reports setup after Act for act-only statements", () => {
    // Arrange
    const purityState = createPurityState({
      allowsAct: true,
      isSetupLike: true,
    });
    const statement = createStatementFixture(["Act"]);

    // Act
    const actualMessages = collectEmittedMessageIds(purityState, statement);

    // Assert
    expect(actualMessages).toStrictEqual(["setupAfterAct"]);
  });

  it("skips setup after Act for meaningful act content", () => {
    // Arrange
    const purityState = createPurityState({
      allowsAct: true,
      isMeaningfulActContent: true,
      isSetupLike: true,
    });
    const statement = createStatementFixture(["Act"]);

    // Act
    const actualMessages = collectEmittedMessageIds(purityState, statement);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });

  it("reports await before non-assertions for assert-only statements", () => {
    // Arrange
    const purityState = createPurityState({
      allowsAssert: true,
      containsAwait: true,
      isValidAssert: false,
    });
    const statement = createStatementFixture(["Assert"]);

    // Act
    const actualMessages = collectEmittedMessageIds(purityState, statement);

    // Assert
    expect(actualMessages).toStrictEqual([
      "awaitOutsideAct",
      "nonAssertionInAssert",
    ]);
  });

  it("stops after mutations for assert-only statements", () => {
    // Arrange
    const purityState = createPurityState({
      allowsAssert: true,
      containsMutation: true,
      isValidAssert: false,
    });
    const statement = createStatementFixture(["Assert"]);

    // Act
    const actualMessages = collectEmittedMessageIds(purityState, statement);

    // Assert
    expect(actualMessages).toStrictEqual(["mutationAfterAct"]);
  });

  it("reports mutations first for act-and-assert statements", () => {
    // Arrange
    const purityState = createPurityState({
      allowsAct: true,
      allowsAssert: true,
      containsAssertion: true,
      containsMutation: true,
      isValidAssert: false,
    });
    const statement = createStatementFixture(["Act", "Assert"]);

    // Act
    const actualMessages = collectEmittedMessageIds(purityState, statement);

    // Assert
    expect(actualMessages).toStrictEqual(["mutationAfterAct"]);
  });

  it("reports assertions outside Assert for arrange-and-act statements", () => {
    // Arrange
    const purityState = createPurityState({
      allowsAct: true,
      allowsArrange: true,
      containsAssertion: true,
    });
    const statement = createStatementFixture(["Arrange", "Act"]);

    // Act
    const actualMessages = collectEmittedMessageIds(purityState, statement);

    // Assert
    expect(actualMessages).toStrictEqual(["assertionOutsideAssert"]);
  });

  it("reports invalid assertions for fully mixed statements", () => {
    // Arrange
    const purityState = createPurityState({
      allowsAct: true,
      allowsArrange: true,
      allowsAssert: true,
      containsAssertion: true,
      isValidAssert: false,
    });
    const statement = createStatementFixture(["Arrange", "Act", "Assert"]);

    // Act
    const actualMessages = collectEmittedMessageIds(purityState, statement);

    // Assert
    expect(actualMessages).toStrictEqual(["nonAssertionInAssert"]);
  });
});
