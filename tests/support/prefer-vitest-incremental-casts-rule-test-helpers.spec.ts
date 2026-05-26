import { existsSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

/** Captured `lintText` invocation payload. */
interface LintTextCall {
  /** Source text sent to ESLint. */
  code: string;

  /** Absolute file path used for the lint run. */
  filePath: string;
}

/** One message entry emitted by the mocked ESLint result. */
interface LintTextMessage {
  /** Message identifier returned by the lint run. */
  messageId: string;
}

/** Options object passed to `lintText`. */
interface LintTextOptions {
  /** File path to associate with the source text. */
  filePath: string;
}

/** Mocked ESLint result shape used in this suite. */
interface MockLintResult {
  /** Reported lint messages. */
  messages: LintTextMessage[];

  /** Optional fixed output emitted by ESLint. */
  output?: string;
}

/** Mutable state captured by the mocked ESLint class. */
const eslintMockState = vi.hoisted(() => ({
  constructorOptions: [] as unknown[],
  lintTextCalls: [] as LintTextCall[],
}));

vi.mock(import("eslint"), () => {
  class MockESLint {
    constructor(options: unknown) {
      eslintMockState.constructorOptions.push(options);
    }

    lintText(
      code: string,
      options: LintTextOptions,
    ): Promise<[MockLintResult | undefined]> {
      eslintMockState.lintTextCalls.push({ code, filePath: options.filePath });

      if (code.includes("throw-me")) {
        return Promise.resolve([void 0]);
      }

      if (code.includes("keep-output")) {
        return Promise.resolve([
          {
            messages: [],
          },
        ]);
      }

      return Promise.resolve([
        {
          messages: [{ messageId: "demo" }],
          output: `${code}\n// fixed`,
        },
      ]);
    }
  }

  return { ESLint: MockESLint } as unknown as typeof import("eslint");
});

import { cleanupTemporaryDirectories, runFix } from "./index";

describe("prefer-vitest-incremental-casts rule test helpers", () => {
  it("runs fixable typed lint cases in an isolated temporary project", async () => {
    // Arrange
    eslintMockState.constructorOptions.length = 0;
    eslintMockState.lintTextCalls.length = 0;
    const code = [
      'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
      'vi.doMock(import("fixture-module"), () => ({ parser }));',
      "",
    ].join("\n");

    // Act
    const actual = await (async () => {
      const result = await runFix(code);
      const lintTextCall = eslintMockState.lintTextCalls[0];
      cleanupTemporaryDirectories();

      return {
        callSummary: {
          callCount: eslintMockState.lintTextCalls.length,
          code: lintTextCall?.code,
          constructorCount: eslintMockState.constructorOptions.length,
          filePathHasExampleName:
            lintTextCall?.filePath.includes("example.spec.ts"),
          filePathStillExists: existsSync(lintTextCall?.filePath ?? ""),
        },
        result,
      };
    })();

    // Assert
    expect(actual.result.messages).toStrictEqual([{ messageId: "demo" }]);
    expect(actual.result.output).toBe(`${code}\n// fixed`);
    expect(actual.callSummary).toStrictEqual({
      callCount: 1,
      code,
      constructorCount: 1,
      filePathHasExampleName: true,
      filePathStillExists: false,
    });
  });

  it("throws when ESLint does not return a lint result", async () => {
    // Arrange
    eslintMockState.constructorOptions.length = 0;

    // Act
    const actualRejection = await (async () => {
      eslintMockState.lintTextCalls.length = 0;
      return runFix(
        "throw-me",
        ["declare const fixture: string;"].join("\n"),
      ).then(
        () => new Error("Expected the lint run to reject."),
        (error: unknown) => error,
      );
    })();

    // Assert
    expect(actualRejection).toBeInstanceOf(Error);
    expect((actualRejection as Error).message).toBe(
      "Expected ESLint to return a lint result.",
    );
  });

  it("falls back to the original code when ESLint omits fixed output", async () => {
    // Arrange
    eslintMockState.constructorOptions.length = 0;
    eslintMockState.lintTextCalls.length = 0;
    const code = [
      'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
      'vi.doMock(import("fixture-module"), () => ({ parser }));',
      "// keep-output",
    ].join("\n");

    // Act
    const result = await runFix(code);

    // Assert
    expect(result.messages).toStrictEqual([]);
    expect(result.output).toBe(code);
  });
});
