import { describe, expect, it } from "vitest";

import { runFix } from "./__tests__/prefer-vi-mocked-import-rule-test-helpers";

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

  it("fixes every supported mock statement in one file", () => {
    // Arrange
    const input = [
      "const a = vi.fn();",
      "const b = vi.fn();",
      'vi.mock(import("./mod"), () => ({ a }));',
      "a.mockResolvedValue(true);",
      'vi.doMock("./mod", () => ({ b }));',
      "b.mockReturnValue(123);",
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import { a, b } from "./mod";',
        "",
        'vi.mock(import("./mod"), () => ({ a: vi.fn() }));',
        "vi.mocked(a).mockResolvedValue(true);",
        'vi.doMock(import("./mod"), () => ({ b: vi.fn() }));',
        "vi.mocked(b).mockReturnValue(123);",
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
