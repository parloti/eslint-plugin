import type { Rule } from "eslint";

import { Linter } from "eslint";
import { parser } from "typescript-eslint";
import { describe, expect, it, vi } from "vitest";

import { noUnusedExportsRule } from "./rule";

/** Result returned from mocked rule execution. */
interface MockedRuleExecutionResult {
  /** Listener returned by rule.create. */
  listener: Rule.RuleListener;
  /** Message ids emitted by context.report. */
  messageIds: string[];
}

/** Report descriptor shape used in mocked rule tests. */
interface ReportDescriptorWithMessageId {
  /** Optional message identifier from one report. */
  messageId?: string;
}

/** Message identifiers observed from one lint run. */
interface RuleCaseResult {
  /** Collected rule message identifiers. */
  messageIds: string[];
}

/** Optional behavior overrides for mocked rule execution. */
interface RunMockedRuleOptions {
  /** Whether collectExportedElements should return one export. */
  hasExportedElements?: boolean;
  /** Whether getTypeScriptProgram should return a program. */
  hasTypeScriptProgram?: boolean;
  /** Whether the mocked file should be treated as lintable. */
  isLintable?: boolean;
  /** Whether the mocked file should be treated as public API. */
  isPublicApiFile?: boolean;
}

/**
 * Runs one rule case against the local ESLint Linter.
 * @param ruleName Rule name registered under the plugin namespace.
 * @param rule Rule implementation under test.
 * @param code Source code passed to the linter.
 * @returns Collected message identifiers from the lint run.
 * @example
 * ```typescript
 * const result = runRuleCase("no-unused-exports", noUnusedExportsRule, "export const value = 1;");
 * ```
 */
const runRuleCase = (
  ruleName: string,
  rule: typeof noUnusedExportsRule,
  code: string,
): RuleCaseResult => {
  const linter = new Linter({ configType: "flat" });

  const config = [
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
            [ruleName]: rule,
          },
        },
      },
      rules: {
        [`codeperfect/${ruleName}`]: "error",
      },
    },
  ] as Parameters<typeof linter.verify>[1];

  return {
    messageIds: linter
      .verify(code, config, "example.ts")
      .map((message) => message.messageId ?? ""),
  };
};

/**
 * Executes the no-unused-exports rule using mocked collaborators.
 * @param classification Classification returned by classifyExportUsage.
 * @param options Behavior overrides for the mocked dependencies.
 * @returns Listener and reported message ids.
 * @example
 * ```typescript
 * const actual = await runMockedRule("unused");
 * void actual;
 * ```
 */
const runMockedRule = async (
  classification: "production" | "test-only" | "unused",
  options?: RunMockedRuleOptions,
): Promise<MockedRuleExecutionResult> => {
  vi.resetModules();

  const hasExportedElements = options?.hasExportedElements ?? true;
  const hasTypeScriptProgram = options?.hasTypeScriptProgram ?? true;
  const isLintable = options?.isLintable ?? true;
  const isPublicApiFile = options?.isPublicApiFile ?? false;
  const reports: ReportDescriptorWithMessageId[] = [];

  vi.doMock(import("./no-unused-exports-options"), async () => {
    const actual = await vi.importActual<
      typeof import("./no-unused-exports-options")
    >("./no-unused-exports-options");

    return {
      ...actual,
      getOptions: () => ({
        publicApiFiles: ["**/index.ts"],
        testFilePatterns: ["**/*.spec.ts"],
      }),
      isLintableFilename: () => isLintable,
      isPublicApiFile: () => isPublicApiFile,
    };
  });

  vi.doMock(import("./no-unused-exports-utilities"), async () => {
    const actual = await vi.importActual<
      typeof import("./no-unused-exports-utilities")
    >("./no-unused-exports-utilities");

    return {
      ...actual,
      classifyExportUsage: () => classification,
      collectCrossFileUsages: (
        _program: unknown,
        _sourceFilename: unknown,
        _state: unknown,
        _repoRoot: unknown,
        _exportedElement: unknown,
      ) => {
        void _program;
        void _sourceFilename;
        void _state;
        void _repoRoot;
        void _exportedElement;
        return [
          {
            isTestFile: classification === "test-only",
          },
        ];
      },
      collectExportedElements: () =>
        hasExportedElements
          ? [
              {
                exportedName: "feature",
                exportKind: "value",
                node: { type: "ExportNamedDeclaration" } as never,
              },
            ]
          : [],
      getTypeScriptProgram: () =>
        hasTypeScriptProgram
          ? ({
              getCurrentDirectory: () => "C:/repo",
            } as never)
          : void 0,
    };
  });

  const { noUnusedExportsRule: mockedRule } = await import("./rule");
  const context = {
    filename: isPublicApiFile
      ? "C:/repo/src/index.ts"
      : "C:/repo/src/feature.ts",
    options: [],
    report: (descriptor: ReportDescriptorWithMessageId) => {
      reports.push(descriptor);
    },
  } as unknown as Rule.RuleContext;

  const listener = mockedRule.create(context);
  listener.Program?.({ body: [] } as never);

  return {
    listener,
    messageIds: reports.map((descriptor) => descriptor.messageId ?? ""),
  };
};

describe("no-unused-exports rule", () => {
  it("defines the expected metadata contract", () => {
    // Arrange
    const metadata = noUnusedExportsRule.meta;

    // Act
    const actualResult = {
      description: metadata?.docs?.description,
      messages: Object.keys(metadata?.messages ?? {}).toSorted((a, b) =>
        a.localeCompare(b),
      ),
      schemaIsArray: Array.isArray(metadata?.schema),
      type: metadata?.type,
    };

    // Assert
    expect(actualResult).toStrictEqual({
      description:
        "Disallow exports that are unused or consumed only by test files.",
      messages: ["unusedExport", "usedOnlyInTests"],
      schemaIsArray: true,
      type: "problem",
    });
  });

  it("does not report when parser services are unavailable", () => {
    // Arrange
    const testCase = {
      code: "export const value = 1;",
    };

    // Act
    const actualResult = runRuleCase(
      "no-unused-exports",
      noUnusedExportsRule,
      testCase.code,
    );

    // Assert
    expect(actualResult.messageIds).toStrictEqual([]);
  });

  it.each([
    ["unused", "unusedExport"],
    ["test-only", "usedOnlyInTests"],
  ] as const)(
    "reports %s usage classifications via Program listener",
    async (classification, expectedMessageId) => {
      // Act
      const actual = await runMockedRule(classification);

      // Assert
      expect(actual.messageIds).toStrictEqual([expectedMessageId]);
    },
  );

  it("does not report production usages", async () => {
    // Act
    const actual = await runMockedRule("production");

    // Assert
    expect(actual.messageIds).toStrictEqual([]);
  });

  it("returns an empty listener when the file is a public API file", async () => {
    // Act
    const actual = await runMockedRule("unused", { isPublicApiFile: true });

    // Assert
    expect(actual.listener).toStrictEqual({});
    expect(actual.messageIds).toStrictEqual([]);
  });

  it("returns an empty listener when parser services do not expose a program", async () => {
    // Act
    const actual = await runMockedRule("unused", {
      hasTypeScriptProgram: false,
    });

    // Assert
    expect(actual.listener).toStrictEqual({});
    expect(actual.messageIds).toStrictEqual([]);
  });

  it("does not report when no exported elements are collected", async () => {
    // Act
    const actual = await runMockedRule("unused", {
      hasExportedElements: false,
    });

    // Assert
    expect(actual.messageIds).toStrictEqual([]);
  });
});
