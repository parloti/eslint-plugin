import { describe, expect, it } from "vitest";

import { enforceAaaPhasePurityRule } from "./rule";
import { runRule, runRuleWithMockedAnalysis } from "./rule-test-helpers";

describe("enforce-aaa-phase-purity rule", () => {
  it("defines metadata and messages", () => {
    // Arrange
    const expectedDescriptionFragment = "phases";

    // Act
    const metadata = enforceAaaPhasePurityRule.meta;

    // Assert
    expect(metadata?.messages).toHaveProperty("missingMeaningfulAct");
    expect(metadata?.docs?.description).toContain(expectedDescriptionFragment);
  });

  it("reports arrange assertions, assert awaits, and non-assertion assert code", () => {
    // Arrange
    const code = [
      'it("covers extra branches", async () => {',
      "  // Arrange",
      "  expect(true).toBe(true);",
      "",
      "  // Act",
      "  const actualResult = run();",
      "",
      "  // Assert",
      "  await verify(actualResult);",
      "  console.log(actualResult);",
      "});",
    ].join("\n");

    // Act
    const messageIds = runRule(code).map((message) => message.messageId);

    // Assert
    expect(messageIds).toStrictEqual([
      "assertionOutsideAssert",
      "awaitOutsideAct",
      "nonAssertionInAssert",
      "nonAssertionInAssert",
    ]);
  });

  it("skips files that do not declare all AAA sections", () => {
    // Arrange
    const code = [
      'it("skips incomplete markup", () => {',
      "  const actualResult = run();",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const messages = runRule(code);

    // Assert
    expect(messages).toStrictEqual([]);
  });

  it("reports await usage inside Assert", () => {
    // Arrange
    const code = [
      'it("awaits in assert", async () => {',
      "  // Arrange",
      "  const input = 1;",
      "",
      "  // Act",
      "  const actualResult = run(input);",
      "",
      "  // Assert",
      "  await verify(actualResult);",
      "});",
    ].join("\n");

    // Act
    const messageIds = runRule(code).map((message) => message.messageId);

    // Assert
    expect(messageIds).toStrictEqual([
      "awaitOutsideAct",
      "nonAssertionInAssert",
    ]);
  });

  it("reports mutation inside Assert", () => {
    // Arrange
    const code = [
      'it("mutates in assert", () => {',
      "  // Arrange",
      "  const items = [1];",
      "",
      "  // Act",
      "  const actualResult = run(items);",
      "",
      "  // Assert",
      "  items.push(actualResult);",
      "});",
    ].join("\n");

    // Act
    const messageIds = runRule(code).map((message) => message.messageId);

    // Assert
    expect(messageIds).toStrictEqual(["mutationAfterAct"]);
  });

  it.each([
    [
      [
        'it("stays clean", async () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const actualResult = await run(input);",
        "",
        "  // Assert",
        "  expect(actualResult).toBe(1);",
        "});",
      ].join("\n"),
    ],
    [
      [
        'it("stays clean in combined phases", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act & Assert",
        "  const actualResult = run(input);",
        "  expect(actualResult).toBe(1);",
        "});",
      ].join("\n"),
    ],
  ])("accepts clean AAA flows %#", (code) => {
    // Arrange

    // Act
    const messages = runRule(code);

    // Assert
    expect(messages).toStrictEqual([]);
  });

  it("reports arrange actions, async arrange work, act setup, and missing meaningful acts", () => {
    // Arrange
    const code = [
      'it("covers arrange and act edge cases", async () => {',
      "  // Arrange",
      "  await run(input);",
      "",
      "  // Act",
      "  const fixture = createFixture();",
      "",
      "  // Assert",
      "  expect(fixture).toBeDefined();",
      "});",
    ].join("\n");

    // Act
    const messageIds = runRule(code).map((message) => message.messageId);

    // Assert
    expect(messageIds).toStrictEqual([
      "awaitOutsideAct",
      "asyncInArrange",
      "actionInArrange",
    ]);
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
    const messages = runRule(code);

    // Assert
    expect(messages).toStrictEqual([]);
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
    const messages = runRule(code);

    // Assert
    expect(messages).toStrictEqual([]);
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
    const reportCalls = await runRuleWithMockedAnalysis(analysis);

    // Assert
    expect(reportCalls).toHaveLength(1);
    expect(reportCalls[0]?.[0]).toMatchObject({
      messageId: "missingMeaningfulAct",
    });
  });
});
