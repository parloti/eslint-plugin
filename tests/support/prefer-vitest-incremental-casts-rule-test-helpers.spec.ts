import { existsSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

/**
 *
 */
const eslintMockState = vi.hoisted(() => ({
  constructorOptions: [] as unknown[],
  lintTextCalls: [] as {
    /**
     *
     */
    code: string; /**
     *
     */
    filePath: string;
  }[],
}));

vi.mock(import("eslint"), () => {
  class MockESLint {
    constructor(options: unknown) {
      eslintMockState.constructorOptions.push(options);
    }

    async lintText(
      code: string,
      options: {
        /**
         *
         */
        filePath: string;
      },
    ): Promise<
      [
        | undefined
        | {
            /**
             *
             */
            messages: {
              /**
               *
               */
              messageId: string;
            }[];

            /**
             *
             */
            output?: string;
          },
      ]
    > {
      eslintMockState.lintTextCalls.push({ code, filePath: options.filePath });

      if (code.includes("throw-me")) {
        return [void 0];
      }

      if (code.includes("keep-output")) {
        return [
          {
            messages: [],
          },
        ];
      }

      return [
        {
          messages: [{ messageId: "demo" }],
          output: `${code}\n// fixed`,
        },
      ];
    }
  }

  return {
    ESLint: MockESLint as unknown as (typeof import("eslint"))["ESLint"],
  } as Partial<typeof import("eslint")>;
});

import { cleanupTemporaryDirectories, runFix } from "./index";

describe("prefer-vitest-incremental-casts rule test helpers", () => {
  it("runs fixable typed lint cases in an isolated temporary project", async () => {
    // Arrange
    eslintMockState.constructorOptions.splice(0);
    eslintMockState.lintTextCalls.splice(0);
    const code = [
      'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
      'vi.doMock(import("fixture-module"), () => ({ parser }));',
      "",
    ].join("\n");

    // Act
    const result = await runFix(code);

    // Assert
    expect(result.messages).toStrictEqual([{ messageId: "demo" }]);
    expect(result.output).toBe(`${code}\n// fixed`);
    expect(eslintMockState.constructorOptions).toHaveLength(1);
    expect(eslintMockState.lintTextCalls).toHaveLength(1);
    expect(eslintMockState.lintTextCalls[0]?.code).toBe(code);
    expect(eslintMockState.lintTextCalls[0]?.filePath).toContain(
      "example.spec.ts",
    );
    expect(existsSync(eslintMockState.lintTextCalls[0]?.filePath ?? "")).toBe(
      false,
    );

    cleanupTemporaryDirectories();
  });

  it("throws when ESLint does not return a lint result", async () => {
    // Arrange
    eslintMockState.constructorOptions.splice(0);

    // Act
    eslintMockState.lintTextCalls.splice(0);

    // Act / Assert

    // Assert
    await expect(
      runFix("throw-me", ["declare const fixture: string;"].join("\n")),
    ).rejects.toThrow("Expected ESLint to return a lint result.");
  });

  it("falls back to the original code when ESLint omits fixed output", async () => {
    // Arrange
    eslintMockState.constructorOptions.splice(0);
    eslintMockState.lintTextCalls.splice(0);
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
