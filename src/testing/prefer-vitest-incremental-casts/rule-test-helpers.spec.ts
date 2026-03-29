import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupTemporaryDirectories, runFix } from "./rule-test-helpers";

/** Mock ESLint instance used in the rejection-path test. */
interface MockEslintInstance {
  /** Mocked lintText implementation. */
  lintText: () => Promise<[]>;
}

/**
 * Returns the empty lint result array used by the rejection-path mock.
 * @returns Empty ESLint results.
 * @example
 * ```typescript
 * const results = await returnEmptyLintResults();
 * void results;
 * ```
 */
async function returnEmptyLintResults(): Promise<[]> {
  await Promise.resolve();

  return [];
}

/**
 * Loads the rule helpers and captures the error raised when no lint result is returned.
 * @returns Error raised by the helper, or a synthesized fallback error.
 * @example
 * ```typescript
 * const actualError = await captureRunFixError();
 * void actualError;
 * ```
 */
const captureRunFixError = async (): Promise<Error> => {
  const helpers = await import("./rule-test-helpers");

  try {
    await helpers.runFix("const value = 1;");

    return new Error("Expected ESLint to return a lint result.");
  } catch (error: unknown) {
    return error instanceof Error
      ? error
      : new Error("Expected ESLint to return a lint result.");
  }
};

describe("prefer-vitest-incremental-casts rule-test-helpers", () => {
  afterEach(cleanupTemporaryDirectories);

  it("exports the typed fixture helpers", () => {
    // Arrange
    const helperTypes = [
      typeof cleanupTemporaryDirectories,
      typeof runFix,
    ] as const;

    // Act & Assert
    expect(helperTypes).toStrictEqual(["function", "function"]);
  });

  it("runs the typed fixture rule and returns fixed output", async () => {
    // Arrange
    const input = [
      "const disableTypeChecked = { rules: [] as string[] };",
      'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
      'const plugin = { meta: { name: "fixture" } };',
      "",
      'vi.doMock(import("fixture-module"), () => ({',
      "  configs: { disableTypeChecked },",
      "  parser,",
      "  plugin,",
      "}));",
      "",
    ].join("\n");

    // Act
    const result = await runFix(input);

    // Assert
    expect(result.messages).toStrictEqual([]);
    expect(result.output).toContain(
      'configs: { disableTypeChecked } as typeof import("fixture-module")["configs"]',
    );
  }, 15_000);

  it("throws when ESLint does not return a lint result", async () => {
    // Arrange
    vi.resetModules();
    vi.doMock(
      import("eslint"),
      (): never =>
        ({
          ESLint: function ESLint(): MockEslintInstance {
            return {
              lintText: returnEmptyLintResults,
            };
          },
        }) as never,
    );

    // Act
    const actualError = await captureRunFixError();

    // Assert
    expect(actualError.message).toBe(
      "Expected ESLint to return a lint result.",
    );
  });
});
