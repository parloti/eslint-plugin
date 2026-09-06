import { describe, expect, it } from "vitest";

import { runFix } from "./__tests__/prefer-vi-mocked-import-rule-test-helpers";
import { hasUnsafeImportCollisions } from "./match-collisions";

describe("prefer-vi-mocked-import match-collisions", () => {
  it("exports hasUnsafeImportCollisions", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof hasUnsafeImportCollisions;

    // Assert
    expect(actualType).toBe(expectedType);
  });
});

describe("prefer-vi-mocked-import rule (collision safety)", () => {
  it("does not report when imported export name would collide with top-level declaration", () => {
    // Arrange
    const input = [
      "const d = 1;",
      "const c = vi.fn();",
      'vi.mock(import("./mod"), () => ({ d: c }));',
      "c.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when imported export name would collide with another module import", () => {
    // Arrange
    const input = [
      'import { d } from "./other";',
      "const c = vi.fn();",
      'vi.mock(import("./mod"), () => ({ d: c }));',
      "c.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when the target module already imports the export under an alias", () => {
    // Arrange
    const input = [
      'import { d as existing } from "./mod";',
      "const c = vi.fn();",
      'vi.mock(import("./mod"), () => ({ d: c }));',
      "c.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("allows namespace imports from the target module", () => {
    // Arrange
    const input = [
      'import * as mod from "./mod";',
      "const c = vi.fn();",
      'vi.mock(import("./mod"), () => ({ d: c }));',
      "c.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.output).toContain('import { d } from "./mod";');
    expect(actual.messages).toStrictEqual([]);
  });

  it("rejects string-named target imports as unsafe", () => {
    // Arrange
    const input = [
      'import { "d" as existing } from "./mod";',
      "const c = vi.fn();",
      'vi.mock(import("./mod"), () => ({ d: c }));',
      "c.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("collects names from nested top-level binding patterns before checking collisions", () => {
    // Arrange
    const input = [
      "const [first, , ...remaining] = values;",
      "const [withDefault = fallback] = defaults;",
      "const { property: nested, ...rest } = objectValue;",
      "const [d] = conflictingValues;",
      "function helper() {}",
      "class Fixture {}",
      "const c = vi.fn();",
      'vi.mock(import("./mod"), () => ({ d: c }));',
      "c.mockResolvedValue(void 0);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });
});
