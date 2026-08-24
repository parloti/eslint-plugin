import { describe, expect, it } from "vitest";

import { runFix } from "./__tests__/no-unsafe-vitest-mock-factory-cast-rule-test-helpers";
import { buildFixes } from "./rule-reporting";

describe("no-unsafe-vitest-mock-factory-cast rule reporting", () => {
  it("exports buildFixes", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof buildFixes;

    // Assert
    expect(actualType).toBe(expectedType);
  });
});

describe("no-unsafe-vitest-mock-factory-cast rule (type imports)", () => {
  it("reuses an existing type import when present", () => {
    // Arrange
    const input = [
      'import type * as FileModule from "./path/to/file";',
      "",
      'vi.mock("./path/to/file", () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import type * as FileModule from "./path/to/file";',
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("inserts the type import after existing imports", () => {
    // Arrange
    const input = [
      'import { something } from "./other";',
      "",
      'vi.mock("./path/to/file", () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import { something } from "./other";',
        'import type * as FileModule from "./path/to/file";',
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });
});
