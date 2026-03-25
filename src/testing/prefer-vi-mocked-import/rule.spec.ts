import { Linter } from "eslint";
import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import { preferViMockedImportRule } from "./rule";

/** Type definition for rule data. */
interface FixRunResult {
  /** Lint messages produced during the run. */
  messages: Linter.LintMessage[];

  /** Output code after fixes. */
  output: string;
}

/**
 * Runs the rule with autofix enabled.
 * @param code Input code.
 * @returns Fixed output and messages.
 * @example
 * ```typescript
 * const result = runFix("const value = 1;\n");
 * ```
 */
const runFix = (code: string): FixRunResult => {
  const linter = new Linter({ configType: "flat" });

  const result = linter.verifyAndFix(
    code,
    [
      {
        files: ["**/*.ts"],
        languageOptions: {
          ecmaVersion: 2022,
          parser,
          parserOptions: { range: true },
          sourceType: "module",
        },
        plugins: {
          codeperfect: {
            rules: {
              "prefer-vi-mocked-import": preferViMockedImportRule,
            },
          },
        },
        rules: {
          "codeperfect/prefer-vi-mocked-import": "error",
        },
      },
    ],
    { filename: "example.spec.ts" },
  );

  return { messages: result.messages, output: result.output };
};

describe("prefer-vi-mocked-import rule (core)", () => {
  it("autofixes the basic pattern", () => {
    // Arrange
    const input = [
      "const installDevelopmentDependencies = vi.fn();",
      'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));',
      "installDevelopmentDependencies.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import { installDevelopmentDependencies } from "./dependencies";',
        "",
        'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies: vi.fn() }));',
        "vi.mocked(installDevelopmentDependencies).mockResolvedValue(void 0);",
        "",
      ].join("\n"),
    );
  });

  it("supports vi.doMock and converts string specifier to import()", () => {
    // Arrange
    const input = [
      "const installDevelopmentDependencies = vi.fn();",
      'vi.doMock("./dependencies", () => ({ installDevelopmentDependencies }));',
      "installDevelopmentDependencies.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import { installDevelopmentDependencies } from "./dependencies";',
        "",
        'vi.doMock(import("./dependencies"), () => ({ installDevelopmentDependencies: vi.fn() }));',
        "vi.mocked(installDevelopmentDependencies).mockResolvedValue(void 0);",
        "",
      ].join("\n"),
    );
  });

  it("inlines multiple mocks and rewrites all call sites", () => {
    // Arrange
    const input = [
      "const a = vi.fn<boolean>();",
      "const b = vi.fn<number>(() => 123);",
      'vi.mock(import("./mod"), () => ({ a, b }));',
      "a.mockResolvedValue(true);",
      "b.mockReturnValue(456);",
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import { a, b } from "./mod";',
        "",
        'vi.mock(import("./mod"), () => ({ a: vi.fn<boolean>(), b: vi.fn<number>(() => 123) }));',
        "vi.mocked(a).mockResolvedValue(true);",
        "vi.mocked(b).mockReturnValue(456);",
        "",
      ].join("\n"),
    );
  });

  it("supports alias properties and uses imported export name", () => {
    // Arrange
    const input = [
      "const c = vi.fn();",
      'vi.mock(import("./mod"), () => ({ d: c }));',
      "c.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import { d } from "./mod";',
        "",
        'vi.mock(import("./mod"), () => ({ d: vi.fn() }));',
        "vi.mocked(d).mockResolvedValue(void 0);",
        "",
      ].join("\n"),
    );
  });

  it("merges into an existing import from the same module", () => {
    // Arrange
    const input = [
      'import { a } from "./mod";',
      "",
      "const b = vi.fn();",
      'vi.mock(import("./mod"), () => ({ a, b }));',
      "b.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import { a, b } from "./mod";',
        "",
        'vi.mock(import("./mod"), () => ({ a, b: vi.fn() }));',
        "vi.mocked(b).mockResolvedValue(void 0);",
        "",
      ].join("\n"),
    );
  });

  it("does not report when the local mock is used outside of supported sites", () => {
    // Arrange
    const input = [
      "const a = vi.fn();",
      "console.log(a);",
      'vi.mock(import("./mod"), () => ({ a }));',
      "a.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });
});

describe("prefer-vi-mocked-import rule (additional)", () => {
  it("inserts the import after existing imports and handles longhand properties", () => {
    // Arrange
    const input = [
      'import { something } from "./other";',
      "",
      "const installDevelopmentDependencies = vi.fn();",
      'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies: installDevelopmentDependencies }));',
      "installDevelopmentDependencies.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import { something } from "./other";',
        'import { installDevelopmentDependencies } from "./dependencies";',
        "",
        'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies: vi.fn() }));',
        "vi.mocked(installDevelopmentDependencies).mockResolvedValue(void 0);",
        "",
      ].join("\n"),
    );
  });

  it("supports block-bodied mock factories", () => {
    // Arrange
    const input = [
      "const installDevelopmentDependencies = vi.fn();",
      'vi.mock(import("./dependencies"), () => { return { installDevelopmentDependencies }; });',
      "installDevelopmentDependencies.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import { installDevelopmentDependencies } from "./dependencies";',
        "",
        'vi.mock(import("./dependencies"), () => { return { installDevelopmentDependencies: vi.fn() }; });',
        "vi.mocked(installDevelopmentDependencies).mockResolvedValue(void 0);",
        "",
      ].join("\n"),
    );
  });

  it("preserves CRLF line endings", () => {
    // Arrange
    const input = [
      "const installDevelopmentDependencies = vi.fn();",
      'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));',
      "installDevelopmentDependencies.mockResolvedValue(void 0);",
      "",
    ].join("\r\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import { installDevelopmentDependencies } from "./dependencies";',
        "",
        'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies: vi.fn() }));',
        "vi.mocked(installDevelopmentDependencies).mockResolvedValue(void 0);",
        "",
      ].join("\r\n"),
    );
  });

  it("does not report when the mock import specifier is not a string literal", () => {
    // Arrange
    const input = [
      "const installDevelopmentDependencies = vi.fn();",
      'const deps = "./dependencies";',
      "vi.mock(import(deps), () => ({ installDevelopmentDependencies }));",
      "installDevelopmentDependencies.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when the initializer is not vi.fn()", () => {
    // Arrange
    const input = [
      "const installDevelopmentDependencies = 123;",
      'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));',
      "installDevelopmentDependencies.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });
});
