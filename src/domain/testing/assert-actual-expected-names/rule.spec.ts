import type { Rule } from "eslint";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AnalyzerModule from "../aaa/analyzer.analysis";
import type * as AnalyzerAssertionsModule from "../aaa/analyzer.assertions.helpers";
import type { LoadRuleInput } from "./__tests__/rule-test-helpers";

import {
  createAnalysisModule,
  createAssertionsModule,
  loadRule,
  resetRuleMockState,
  runRule,
} from "./__tests__/rule-test-helpers";

describe("assert-actual-expected-names rule", () => {
  beforeEach(() => {
    resetRuleMockState();
    vi.doMock(
      import("../aaa/analyzer.analysis"),
      createMockProxy<typeof AnalyzerModule>(createAnalysisModule()),
    );
    vi.doMock(
      import("../aaa/analyzer.assertions.helpers"),
      createMockProxy<typeof AnalyzerAssertionsModule>(
        createAssertionsModule(),
      ),
    );
  });

  it("defines metadata and messages", async () => {
    // Arrange
    const input = {
      analysis: void 0,
      assertionIdentifiers: new Map(),
      assertionNodes: new Set(),
      declaredIdentifiers: new Map(),
    } satisfies LoadRuleInput;

    // Act
    const actual = await loadRule(input);

    // Assert
    expect(actual.assertActualExpectedNamesRule.meta?.messages).toHaveProperty(
      "missingPrefix",
    );
    expect(
      actual.assertActualExpectedNamesRule.meta?.docs?.description?.includes(
        "Assert-phase",
      ) ?? false,
    ).toBe(true);
  });

  it("skips unsupported test blocks", async () => {
    // Arrange
    const input = {
      analysis: void 0,
      assertionIdentifiers: new Map(),
      assertionNodes: new Set(),
      declaredIdentifiers: new Map(),
    } satisfies LoadRuleInput;

    // Act
    const actual = await runRule(input);

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("reports each missing prefix only once", async () => {
    // Arrange
    const firstAssertion = { type: "ExpressionStatement" } as never;
    const repeatedAssertion = { type: "ExpressionStatement" } as never;
    const ignoredAssertion = { type: "ExpressionStatement" } as never;
    const actualNode = { name: "result", type: "Identifier" } as Rule.Node;
    const expectedNode = { name: "value", type: "Identifier" } as Rule.Node;
    const analysis = {
      statements: [
        { node: firstAssertion, phases: ["Assert"] },
        { node: repeatedAssertion, phases: ["Assert"] },
        { node: ignoredAssertion, phases: ["Arrange"] },
      ],
    };
    const input = {
      analysis,
      assertionIdentifiers: new Map([
        [firstAssertion, { actual: "result", expected: "value" }],
        [ignoredAssertion, { expected: "value" }],
        [repeatedAssertion, { actual: "result", expected: "expectedValue" }],
      ]),
      assertionNodes: new Set([
        firstAssertion,
        ignoredAssertion,
        repeatedAssertion,
      ]),
      declaredIdentifiers: new Map([
        ["result", actualNode],
        ["value", expectedNode],
      ]),
    } satisfies LoadRuleInput;

    // Act
    const actual = await runRule(input);

    // Assert
    expect(actual).toStrictEqual([
      {
        data: { name: "result", prefix: "actual" },
        messageId: "missingPrefix",
        node: actualNode,
      },
      {
        data: { name: "value", prefix: "expected" },
        messageId: "missingPrefix",
        node: expectedNode,
      },
    ]);
  });

  it("reports missing actual prefix for Act declarations used in Assert", async () => {
    // Arrange
    const assertion = { type: "ExpressionStatement" } as never;
    const actDeclaration = {
      declarations: [{ id: { name: "result", type: "Identifier" } }],
      type: "VariableDeclaration",
    } as never;
    const resultNode = { name: "result", type: "Identifier" } as Rule.Node;
    const expectedNode = {
      name: "expectedValue",
      type: "Identifier",
    } as Rule.Node;
    const analysis = {
      statements: [
        { node: actDeclaration, phases: ["Act"] },
        { node: assertion, phases: ["Assert"] },
      ],
    };
    const input = {
      analysis,
      assertionIdentifiers: new Map([
        [assertion, { actual: "result", expected: "expectedValue" }],
      ]),
      assertionNodes: new Set([assertion]),
      declaredIdentifiers: new Map([["expectedValue", expectedNode]]),
    } satisfies LoadRuleInput;

    // Act
    const actual = await runRule(input);

    // Assert
    expect(actual).toStrictEqual([
      {
        data: { name: "result", prefix: "actual" },
        messageId: "missingPrefix",
        node: resultNode,
      },
    ]);
  });

  it("reports only missing expected prefix when actual is already prefixed", async () => {
    // Arrange
    const assertion = { type: "ExpressionStatement" } as never;
    const actDeclaration = {
      declarations: [{ id: { name: "actualResult", type: "Identifier" } }],
      type: "VariableDeclaration",
    } as never;
    const expectedNode = { name: "value", type: "Identifier" } as Rule.Node;
    const analysis = {
      statements: [
        { node: actDeclaration, phases: ["Act"] },
        { node: assertion, phases: ["Assert"] },
      ],
    };
    const input = {
      analysis,
      assertionIdentifiers: new Map([
        [assertion, { actual: "actualResult", expected: "value" }],
      ]),
      assertionNodes: new Set([assertion]),
      declaredIdentifiers: new Map([["value", expectedNode]]),
    } satisfies LoadRuleInput;

    // Act
    const actual = await runRule(input);

    // Assert
    expect(actual).toStrictEqual([
      {
        data: { name: "value", prefix: "expected" },
        messageId: "missingPrefix",
        node: expectedNode,
      },
    ]);
  });

  it("ignores Act declarations that do not declare Identifier bindings", async () => {
    // Arrange
    const assertion = { type: "ExpressionStatement" } as never;
    const actDeclaration = {
      declarations: [{ id: { properties: [], type: "ObjectPattern" } }],
      type: "VariableDeclaration",
    } as unknown as never;
    const expectedNode = {
      name: "expectedValue",
      type: "Identifier",
    } as Rule.Node;
    const analysis = {
      statements: [
        { node: actDeclaration, phases: ["Act"] },
        { node: assertion, phases: ["Assert"] },
      ],
    };
    const input = {
      analysis,
      assertionIdentifiers: new Map([
        [assertion, { actual: "result", expected: "expectedValue" }],
      ]),
      assertionNodes: new Set([assertion]),
      declaredIdentifiers: new Map([["expectedValue", expectedNode]]),
    } satisfies LoadRuleInput;

    // Act
    const actual = await runRule(input);

    // Assert
    expect(actual).toStrictEqual([]);
  });
});
