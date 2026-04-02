import { describe, expect, it } from "vitest";

import { preferViMockedImportRule } from "../../src";
import { runRuleCase } from "../support";

describe("prefer-vi-mocked-import e2e", () => {
  it.each([
    {
      code: [
        "const installDevelopmentDependencies = vi.fn();",
        'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));',
        "installDevelopmentDependencies.mockResolvedValue(void 0);",
        "",
      ].join("\n"),
      errors: [{ messageId: "preferViMockedImport" }],
      filename: "example.spec.ts",
      output: [
        'import { installDevelopmentDependencies } from "./dependencies";',
        "",
        'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies: vi.fn() }));',
        "vi.mocked(installDevelopmentDependencies).mockResolvedValue(void 0);",
        "",
      ].join("\n"),
    },
    {
      code: [
        "/** Mocked getParentFolder utility. */",
        "const installDevelopmentDependencies = vi.fn();",
        'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));',
        "installDevelopmentDependencies.mockResolvedValue(void 0);",
        "",
        "const x = 0",
        "",
        "const dependencies = vi.fn();",
        'vi.mock(import("./dep"), () => ({ dependencies }));',
        "dependencies.mockResolvedValue(void 0);",
        "",
      ].join("\n"),
      errors: [
        { messageId: "preferViMockedImport" },
        { messageId: "preferViMockedImport" },
      ],
      filename: "example.spec.ts",
      output: [
        'import { dependencies } from "./dep";',
        'import { installDevelopmentDependencies } from "./dependencies";',
        "",
        'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies: vi.fn() }));',
        "vi.mocked(installDevelopmentDependencies).mockResolvedValue(void 0);",
        "",
        "const x = 0",
        "",
        'vi.mock(import("./dep"), () => ({ dependencies: vi.fn() }));',
        "vi.mocked(dependencies).mockResolvedValue(void 0);",
        "",
      ].join("\n"),
    },
  ])("rewrites direct mocks to vi.mocked imports %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "prefer-vi-mocked-import",
      preferViMockedImportRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
    expect(result.output).toBe(testCase.output);
  });

  it("accepts reused mock bindings", () => {
    // Arrange
    const testCase = {
      code: [
        "const installDevelopmentDependencies = vi.fn();",
        "console.log(installDevelopmentDependencies);",
        'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));',
        "installDevelopmentDependencies.mockResolvedValue(void 0);",
        "",
      ].join("\n"),
      filename: "example.spec.ts",
    };

    // Act
    const result = runRuleCase(
      "prefer-vi-mocked-import",
      preferViMockedImportRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
