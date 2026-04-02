import type { Rule, SourceCode } from "eslint";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireExampleLanguageRule } from "./rule";

/** Example entry returned by the mocked collector. */
interface ExampleRecord {
  /** Example content text. */
  content: string;
  /** Ending line index in the comment. */
  endIndex: number;
  /** Ending character offset. */
  endOffset: number;
  /** Line index within the comment. */
  lineIndex: number;
  /** Raw line prefix. */
  prefix: string;
  /** Starting character offset. */
  startOffset: number;
}

/** Mocked examples module shape. */
interface ExamplesModule {
  /** Mocked example collector. */
  getExamples: (commentValue: string) => ExampleRecord[];
}

/** Mock type used for the example collector. */
type GetExamplesMock = ReturnType<
  typeof vi.fn<(commentValue: string) => ExampleRecord[]>
>;

/** Mock type used for example reporting. */
type ReportExampleMock = ReturnType<typeof vi.fn<(context: unknown) => void>>;

/** Block comment fixture used by the reporting scenario. */
interface ReportingBlockComment {
  /** Comment node type. */
  type: "Block";

  /** Raw comment text. */
  value: string;
}

/** Mocked reporting module shape. */
interface ReportingModule {
  /** Mocked reporting helper. */
  reportExample: (context: unknown) => void;
}

/** Fixture data used by the reporting behavior test. */
interface ReportingScenario {
  /** Block comment analyzed by the rule. */
  blockComment: ReportingBlockComment;
  /** Mocked example collector. */
  getExamples: GetExamplesMock;
  /** Mocked example reporter. */
  reportExample: ReportExampleMock;
  /** Source code object passed to the rule. */
  sourceCode: SourceCode;
}

/** Imported rule module shape used in tests. */
interface RequireExampleLanguageModule {
  /** Rule under test. */
  requireExampleLanguageRule: Rule.RuleModule;
}

/** Active mocked example collector. */
let activeGetExamples: GetExamplesMock;

/** Active mocked example reporter. */
let activeReportExample: ReportExampleMock;

/**
 * Creates the mocked examples module.
 * @returns Mocked examples module exports.
 * @example
 * ```typescript
 * const mockedExamples = createExamplesModule();
 * ```
 */
function createExamplesModule(): ExamplesModule {
  return {
    getExamples: (commentValue: string): ExampleRecord[] =>
      activeGetExamples(commentValue),
  };
}

/**
 * Creates the mocked reporting module.
 * @returns Mocked reporting module exports.
 * @example
 * ```typescript
 * const mockedReporting = createReportingModule();
 * ```
 */
function createReportingModule(): ReportingModule {
  return {
    reportExample: (context): void => {
      activeReportExample(context);
    },
  };
}

/**
 * Loads the rule with mocked example helpers.
 * @param getExamples Mocked example collector.
 * @param reportExample Mocked report helper.
 * @returns Imported rule module.
 * @example
 * ```typescript
 * const module = await loadMockedRule(vi.fn(), vi.fn());
 * ```
 */
const loadMockedRule = async (
  getExamples: GetExamplesMock,
  reportExample: ReportExampleMock,
): Promise<RequireExampleLanguageModule> => {
  activeGetExamples = getExamples;
  activeReportExample = reportExample;

  return import("./rule");
};

/**
 * Executes the rule with mocked example helpers against one source object.
 * @param sourceCode SourceCode object passed to the rule.
 * @param getExamples Mocked example collector.
 * @param reportExample Mocked report helper.
 * @returns Promise resolved after the rule is created.
 * @example
 * ```typescript
 * const listeners = await runMockedRule({ getAllComments: () => [] } as SourceCode, vi.fn(), vi.fn());
 * void listeners;
 * ```
 */
const runMockedRule = async (
  sourceCode: SourceCode,
  getExamples: GetExamplesMock,
  reportExample: ReportExampleMock,
): Promise<Rule.RuleListener> => {
  const { requireExampleLanguageRule: mockedRule } = await loadMockedRule(
    getExamples,
    reportExample,
  );
  const context = {
    report(descriptor: Rule.ReportDescriptor): void {
      void descriptor;
    },
    sourceCode,
  } as unknown as Rule.RuleContext;

  return mockedRule.create(context);
};

/**
 * Creates the fixture state for the reporting behavior test.
 * @returns Mocked collector, reporter, and source code.
 * @example
 * ```typescript
 * const scenario = createReportingScenario();
 * void scenario;
 * ```
 */
function createReportingScenario(): ReportingScenario {
  const blockComment: ReportingBlockComment = {
    type: "Block",
    value: "* @example first()",
  };

  return {
    blockComment,
    getExamples: vi.fn<(commentValue: string) => ExampleRecord[]>(
      (commentValue) => {
        void commentValue;
        return [
          {
            content: "first()",
            endIndex: 0,
            endOffset: 8,
            lineIndex: 0,
            prefix: " * ",
            startOffset: 0,
          },
          {
            content: "second()",
            endIndex: 1,
            endOffset: 17,
            lineIndex: 1,
            prefix: " * ",
            startOffset: 9,
          },
        ];
      },
    ),
    reportExample: vi.fn<(context: unknown) => void>((context) => {
      void context;
    }),
    sourceCode: {
      getAllComments: () => [
        { type: "Line", value: " @example ignored()" },
        blockComment,
      ],
    } as SourceCode,
  };
}

describe("require example language rule", () => {
  beforeEach(() => {
    activeGetExamples = vi.fn<(commentValue: string) => ExampleRecord[]>(
      (commentValue) => {
        void commentValue;
        return [];
      },
    );
    activeReportExample = vi.fn<(context: unknown) => void>((context) => {
      void context;
    });
    vi.resetModules();
    vi.doMock(import("./examples"), createExamplesModule);
    vi.doMock(import("./reporting"), createReportingModule);
  });

  afterEach(() => {
    vi.doUnmock("./examples");
    vi.doUnmock("./reporting");
    vi.resetModules();
  });

  it("exposes metadata", () => {
    // Arrange
    const ruleType = requireExampleLanguageRule.meta?.type;

    // Act
    const createType = typeof requireExampleLanguageRule.create;

    // Assert
    expect(ruleType).toBe("problem");
    expect(createType).toBe("function");
  });

  it("ignores non-block or non-jsdoc comments", () => {
    // Arrange
    let reportCalls = 0;
    const sourceCode = {
      getAllComments: () => [
        { type: "Line", value: " @example" },
        { type: "Block", value: " Not jsdoc" },
      ],
    } as SourceCode;
    const context = {
      report(): void {
        reportCalls += 1;
      },
      sourceCode,
    } as unknown as Rule.RuleContext;

    // Act
    const actual = requireExampleLanguageRule.create(context);

    // Assert
    expect(actual).toStrictEqual({});
    expect(reportCalls).toBe(0);
  });

  it("reports every jsdoc example and flags sibling examples", async () => {
    // Arrange
    const scenario = createReportingScenario();

    // Act
    const actualRuleResult = await runMockedRule(
      scenario.sourceCode,
      scenario.getExamples,
      scenario.reportExample,
    );

    // Assert
    const actualReportCalls = scenario.reportExample.mock.calls as readonly (readonly unknown[])[];
    const actualFirstReport = actualReportCalls[0]?.[0];
    const actualSecondReport = actualReportCalls[1]?.[0];

    expect(actualRuleResult).toStrictEqual({});

    expect(scenario.getExamples).toHaveBeenCalledWith("* @example first()");
    expect(scenario.reportExample).toHaveBeenCalledTimes(2);
    expect(actualFirstReport).toMatchObject({
      comment: scenario.blockComment,
      hasOtherExamples: true,
    });
    expect(actualSecondReport).toMatchObject({
      comment: scenario.blockComment,
      hasOtherExamples: true,
    });
  });
});
