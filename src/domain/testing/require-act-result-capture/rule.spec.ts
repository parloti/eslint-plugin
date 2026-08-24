import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AnalyzerModule from "../aaa/analyzer.analysis";
import type * as AnalyzerClassificationModule from "../aaa/analyzer.classification.helpers";

import {
  activeCaptureStateHolder,
  createAnalysisModule,
  createCallStatement,
  createClassificationModule,
  createIdentifier,
  loadRule,
  runRule,
} from "./__tests__/require-act-result-capture-rule-test-helpers";

describe("require-act-result-capture rule", () => {
  beforeEach(() => {
    activeCaptureStateHolder.current = {
      analysis: void 0,
      capturableNodes: new Set(),
    };
    vi.doMock(
      import("../aaa/analyzer.analysis"),
      createMockProxy<typeof AnalyzerModule>(createAnalysisModule()),
    );
    vi.doMock(
      import("../aaa/analyzer.classification.helpers"),
      createMockProxy<typeof AnalyzerClassificationModule>(
        createClassificationModule(),
      ),
    );
  });

  it("defines metadata and messages", async () => {
    // Arrange
    const expectedDescriptionFragment = "Act expressions";

    // Act
    const actual = await loadRule(void 0, new Set());

    // Assert
    expect(actual.requireActResultCaptureRule.meta?.messages).toHaveProperty(
      "captureActResult",
    );
    expect(
      actual.requireActResultCaptureRule.meta?.docs?.description?.includes(
        expectedDescriptionFragment,
      ) ?? false,
    ).toBe(true);
  });

  it("skips unsupported test blocks", async () => {
    // Arrange
    const expected: [] = [];

    // Act
    const actual = await runRule(void 0, new Set());

    // Assert
    expect(actual).toStrictEqual(expected);
  });

  it("reports only capturable Act statements that are not helper-driven", async () => {
    // Arrange
    const capturableStatement = createCallStatement({
      arguments: [],
      callee: createIdentifier("runFeature"),
      type: "CallExpression",
    });
    const contextReportStatement = createCallStatement({
      arguments: [],
      callee: {
        object: createIdentifier("context"),
        property: createIdentifier("report"),
        type: "MemberExpression",
      },
      type: "CallExpression",
    });
    const helperDrivenStatement = createCallStatement({
      arguments: [],
      callee: createIdentifier("runListener"),
      type: "CallExpression",
    });
    const ruleCreateStatement = createCallStatement({
      arguments: [],
      callee: {
        object: createIdentifier("customRule"),
        property: createIdentifier("create"),
        type: "MemberExpression",
      },
      type: "CallExpression",
    });
    const assertStatement = createCallStatement({
      arguments: [],
      callee: createIdentifier("assertLater"),
      type: "CallExpression",
    });
    const analysis = {
      statements: [
        { node: capturableStatement, phases: ["Act"] },
        { node: contextReportStatement, phases: ["Act"] },
        { node: helperDrivenStatement, phases: ["Act"] },
        { node: ruleCreateStatement, phases: ["Act"] },
        { node: assertStatement, phases: ["Act", "Assert"] },
      ],
    };
    const capturableNodes = new Set([
      assertStatement,
      capturableStatement,
      contextReportStatement,
      helperDrivenStatement,
      ruleCreateStatement,
    ]);

    // Act
    const actual = await runRule(analysis, capturableNodes);

    // Assert
    expect(actual).toStrictEqual([
      {
        messageId: "captureActResult",
        node: capturableStatement,
      },
    ]);
  });

  it("does not report when statements are not capturable", async () => {
    // Arrange
    const nonExpressionStatement = { type: "VariableDeclaration" };
    const nonCallStatement = {
      expression: { type: "Identifier" },
      type: "ExpressionStatement",
    };
    const analysis = {
      statements: [
        { node: nonExpressionStatement, phases: ["Act"] },
        { node: nonCallStatement, phases: ["Act"] },
      ],
    };
    const capturableNodes = new Set();

    // Act
    const actual = await runRule(analysis, capturableNodes);

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("reports report-prefixed calls that are not in the helper allowlist", async () => {
    // Arrange
    const reportMetricsStatement = createCallStatement({
      arguments: [],
      callee: createIdentifier("reportMetrics"),
      type: "CallExpression",
    });
    const analysis = {
      statements: [{ node: reportMetricsStatement, phases: ["Act"] }],
    };
    const capturableNodes = new Set([reportMetricsStatement]);

    // Act
    const actual = await runRule(analysis, capturableNodes);

    // Assert
    expect(actual).toStrictEqual([
      {
        messageId: "captureActResult",
        node: reportMetricsStatement,
      },
    ]);
  });

  it("skips namespaced rule create calls", async () => {
    // Arrange
    const namespacedRuleCreateStatement = createCallStatement({
      arguments: [],
      callee: {
        object: {
          object: createIdentifier("testing"),
          property: createIdentifier("customRule"),
          type: "MemberExpression",
        },
        property: createIdentifier("create"),
        type: "MemberExpression",
      },
      type: "CallExpression",
    });
    const analysis = {
      statements: [{ node: namespacedRuleCreateStatement, phases: ["Act"] }],
    };
    const capturableNodes = new Set([namespacedRuleCreateStatement]);

    // Act
    const actual = await runRule(analysis, capturableNodes);

    // Assert
    expect(actual).toStrictEqual([]);
  });
});
