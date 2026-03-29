import type * as ESTree from "estree";

import { Linter } from "eslint";
import { parser } from "typescript-eslint";
import { vi } from "vitest";

import type * as AaaModule from "../aaa";
import type { TestBlockAnalysis } from "../aaa";

import { enforceAaaPhasePurityRule } from "./rule";

/** Minimal analysis input accepted by the mocked AAA helper. */
interface MockedAnalysisInput {
  /** Section comments relevant to the rule under test. */
  sectionComments: {
    /** Phase names declared by the synthetic comment. */
    phases: TestBlockAnalysis["sectionComments"][number]["phases"];
  }[];
  /** Statement metadata relevant to the rule under test. */
  statements: {
    /** Synthetic statement node provided to the rule. */
    node: ESTree.Statement;

    /** Active phases assigned to the statement. */
    phases: TestBlockAnalysis["statements"][number]["phases"];
  }[];
}

/** Module shape returned when the rule is loaded after mocking the AAA helpers. */
interface MockedRuleModule {
  /** Rule implementation under test. */
  enforceAaaPhasePurityRule: typeof enforceAaaPhasePurityRule;
}

/**
 * Creates the mocked AAA module used by the rule test helper.
 * @param mockedAnalysis Mocked analysis returned by the helper.
 * @returns Partial AAA module used for Vitest mocking.
 * @example
 * ```typescript
 * const module = createMockedAaaModule(createMockedAnalysis({ sectionComments: [], statements: [] }));
 * void module;
 * ```
 */
function createMockedAaaModule(
  mockedAnalysis: TestBlockAnalysis,
): Partial<typeof AaaModule> {
  return {
    analyzeTestBlock: (): TestBlockAnalysis => mockedAnalysis,
    hasAssertion: (): boolean => false,
    hasAsyncLogic: (): boolean => false,
    hasAwait: (): boolean => false,
    hasCapturableActResult: (): boolean => false,
    hasMutation: (): boolean => false,
    isMeaningfulActStatement: (): boolean => false,
    isSetupLikeStatement: (): boolean => false,
    isValidAssertStatement: (): boolean => false,
  };
}

/**
 * Creates a full analysis object from the minimal fields used in tests.
 * @param analysis Minimal analysis input used by tests.
 * @returns Complete analysis object consumed by the rule.
 * @example
 * ```typescript
 * const result = createMockedAnalysis({ sectionComments: [], statements: [] });
 * void result;
 * ```
 */
function createMockedAnalysis(
  analysis: MockedAnalysisInput,
): TestBlockAnalysis {
  return {
    body: createMockedBody(),
    bodyLineCount: 0,
    callExpression: createMockedCallExpression(),
    newline: "\n",
    sectionComments: analysis.sectionComments.map((sectionComment) => ({
      comment: {
        loc: {
          end: { column: 0, line: 1 },
          start: { column: 0, line: 1 },
        },
        range: [0, 0],
        type: "Line",
        value: ` ${sectionComment.phases.join(" / ")}`,
      },
      phases: sectionComment.phases,
    })),
    sourceText: "",
    statements: analysis.statements.map((statement) => ({
      node: statement.node as TestBlockAnalysis["statements"][number]["node"],
      phase: statement.phases.at(-1),
      phases: statement.phases,
    })),
  };
}

/**
 * Creates a minimal located block statement for mocked AAA analysis.
 * @returns Minimal located block statement.
 * @example
 * ```typescript
 * const body = createMockedBody();
 * ```
 */
function createMockedBody(): TestBlockAnalysis["body"] {
  return {
    body: [],
    loc: {
      end: { column: 0, line: 1 },
      start: { column: 0, line: 1 },
    },
    range: [0, 0],
    type: "BlockStatement",
  } as TestBlockAnalysis["body"];
}

/**
 * Creates a minimal located call expression for mocked AAA analysis.
 * @returns Minimal located call expression.
 * @example
 * ```typescript
 * const callExpression = createMockedCallExpression();
 * ```
 */
function createMockedCallExpression(): TestBlockAnalysis["callExpression"] {
  return {
    arguments: [],
    callee: { name: "it", type: "Identifier" } as ESTree.Identifier,
    loc: {
      end: { column: 0, line: 1 },
      start: { column: 0, line: 1 },
    },
    optional: false,
    range: [0, 0],
    type: "CallExpression",
  } as TestBlockAnalysis["callExpression"];
}

/**
 * Creates the mocked rule listener used by the helper.
 * @param analysis Mocked analysis returned from `analyzeTestBlock`.
 * @param report Report spy passed into the mocked rule context.
 * @returns Call-expression listener produced by the mocked rule.
 * @example
 * ```typescript
 * const listener = await loadMockedListener({ sectionComments: [], statements: [] }, vi.fn());
 * void listener;
 * ```
 */
async function loadMockedListener(
  analysis: MockedAnalysisInput,
  report: ReturnType<typeof vi.fn>,
): Promise<((node: ESTree.CallExpression) => void) | undefined> {
  vi.resetModules();
  vi.doMock("../aaa", () =>
    createMockedAaaModule(createMockedAnalysis(analysis)),
  );

  const ruleModule: MockedRuleModule = await import("./rule");

  return ruleModule.enforceAaaPhasePurityRule.create({ report } as never)
    .CallExpression as ((node: ESTree.CallExpression) => void) | undefined;
}

/**
 * Resets the mocked AAA module state between test runs.
 * @example
 * ```typescript
 * resetMockedAaaModule();
 * ```
 */
function resetMockedAaaModule(): void {
  vi.doUnmock("../aaa");
  vi.resetModules();
}

/**
 * Runs the rule against one source snippet.
 * @param code Source code passed to the linter.
 * @returns Lint messages produced by the rule.
 * @example
 * ```typescript
 * const messages = runRule('it("works", () => {});');
 * void messages;
 * ```
 */
function runRule(code: string): Linter.LintMessage[] {
  const linter = new Linter({ configType: "flat" });

  return linter.verify(
    code,
    [
      {
        files: ["**/*.ts"],
        languageOptions: {
          ecmaVersion: 2022,
          parser,
          sourceType: "module",
        },
        plugins: {
          codeperfect: {
            rules: {
              "enforce-aaa-phase-purity": enforceAaaPhasePurityRule,
            },
          },
        },
        rules: {
          "codeperfect/enforce-aaa-phase-purity": "error",
        },
      },
    ],
    "example.spec.ts",
  );
}

/**
 * Runs the rule with a mocked AAA analysis result.
 * @param analysis Mocked analysis returned from `analyzeTestBlock`.
 * @returns Captured report calls issued by the rule.
 * @example
 * ```typescript
 * const calls = await runRuleWithMockedAnalysis({ sectionComments: [], statements: [] });
 * void calls;
 * ```
 */
async function runRuleWithMockedAnalysis(
  analysis: MockedAnalysisInput,
): Promise<unknown[][]> {
  const report = vi.fn();
  const listener = await loadMockedListener(analysis, report);

  try {
    listener?.({ type: "CallExpression" } as ESTree.CallExpression);
    return report.mock.calls as unknown[][];
  } finally {
    resetMockedAaaModule();
  }
}

export { runRule, runRuleWithMockedAnalysis };
