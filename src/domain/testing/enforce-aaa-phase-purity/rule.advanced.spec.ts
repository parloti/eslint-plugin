import { describe, expect, it } from "vitest";

import { runRule, runRuleWithMockedAnalysis } from "./rule-test-helpers";
import { advancedPatternsMarker } from "./rule.advanced";

describe("enforce-aaa-phase-purity rule - advanced patterns", () => {
  it("exports the advanced patterns marker", () => {
    // Arrange
    const expectedType = "object";

    // Act
    const actualMarkerType = typeof advancedPatternsMarker;

    // Assert
    expect(actualMarkerType).toBe(expectedType);
  });

  it("ignores statements that appear before the first AAA section marker", () => {
    // Arrange
    const code = [
      'it("allows pre-section statements", () => {',
      "  helper();",
      "  // Arrange",
      "  const input = 1;",
      "",
      "  // Act",
      "  const actualResult = run(input);",
      "",
      "  // Assert",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const actualMessages = runRule(code);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });

  it("treats destructured act results as meaningful when asserted", () => {
    // Arrange
    const code = [
      'it("tracks destructured act results", () => {',
      "  // Arrange",
      "  const input = 1;",
      "",
      "  // Act",
      "  const { value: actualValue = input, ...rest } = getObject(input);",
      "  const [, first = input, ...others] = getList(input);",
      "",
      "  // Assert",
      "  let pendingResult;",
      "  const summary = actualValue;",
      "  expect(summary).toBe(input);",
      "  expect(rest).toBeDefined();",
      "  expect(first).toBe(input);",
      "  expect(others).toBeDefined();",
      "});",
    ].join("\n");

    // Act
    const actualMessages = runRule(code);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });

  it("ignores unsupported declaration patterns when collecting asserted act results", async () => {
    // Arrange
    const analysis: Parameters<typeof runRuleWithMockedAnalysis>[0] = {
      sectionComments: [
        { phases: ["Arrange"] },
        { phases: ["Act"] },
        { phases: ["Assert"] },
      ],
      statements: [
        {
          node: {
            declarations: [
              {
                id: {
                  computed: false,
                  object: { name: "result", type: "Identifier" },
                  optional: false,
                  property: { name: "value", type: "Identifier" },
                  type: "MemberExpression",
                },
                init: void 0,
                type: "VariableDeclarator",
              },
            ],
            kind: "const",
            type: "VariableDeclaration",
          },
          phases: ["Act"],
        },
      ],
    };

    // Act
    const actualReportCalls = await runRuleWithMockedAnalysis(analysis);

    // Assert
    expect(actualReportCalls).toHaveLength(1);
    expect(actualReportCalls[0]?.[0]).toMatchObject({
      messageId: "missingMeaningfulAct",
    });
  });

  it("accepts new WeakSet() in Arrange without reporting actionInArrange", () => {
    // Arrange
    const code = [
      'it("uses WeakSet in arrange", () => {',
      "  // Arrange",
      "  const seenNodes = new WeakSet();",
      "",
      "  // Act",
      "  const actualResult = run(seenNodes);",
      "",
      "  // Assert",
      "  expect(actualResult).toBe(true);",
      "});",
    ].join("\n");

    // Act
    const actualMessages = runRule(code);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });

  it("accepts async runner function defined in Arrange without reporting asyncInArrange", () => {
    // Arrange
    const code = [
      'it("defers async work through runner", async () => {',
      "  // Arrange",
      "  const runner = async (): Promise<number> => {",
      "    const value = await getValue();",
      "    return value;",
      "  };",
      "",
      "  // Act",
      "  const actualResult = await runner();",
      "",
      "  // Assert",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const actualMessages = runRule(code);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });

  it("accepts new Error() in Arrange without reporting actionInArrange", () => {
    // Arrange
    const code = [
      'it("uses Error in arrange", () => {',
      "  // Arrange",
      "  const error = new Error('Test Error');",
      "",
      "  // Act",
      "  const actualResult = run(error);",
      "",
      "  // Assert",
      "  expect(actualResult).toThrow();",
      "});",
    ].join("\n");

    // Act
    const actualMessages = runRule(code);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });
});
