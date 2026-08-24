import { describe, expect, it } from "vitest";

import { runFix } from "./__tests__/no-unsafe-vitest-mock-factory-cast-rule-test-helpers";

describe("no-unsafe-vitest-mock-factory-cast rule (core fixes)", () => {
  it("replaces a casted vi.mock factory with createMockProxy and a type import", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const { messages, output } = runFix(input);

    // Assert
    expect(messages).toStrictEqual([]);
    expect(output).toBe(
      [
        'import type * as FileModule from "./path/to/file";',
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("supports vi.doMock and nested casts", () => {
    // Arrange
    const input = [
      'vi.doMock(import("./path/to/file"), () => ((({ prop: value } as unknown) as Type)));',
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import type * as FileModule from "./path/to/file";',
        "",
        'vi.doMock(import("./path/to/file"), createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("supports function-expression factories", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", function () { return ({ prop: value } as Type); });',
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

  it("reports but does not autofix async factories", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", async () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toHaveLength(1);
    expect(actual.output).toBe(input);
  });

  it("reports but does not autofix function-expression factories with parameters", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", function (ctx) { return ({ prop: value } as Type); });',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toHaveLength(1);
    expect(actual.output).toBe(input);
  });

  it("supports factories using TypeScript assertion syntax", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", () => (<Type>{ prop: value }));',
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

  it("reports but does not autofix factories with side effects", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", () => { setup(); return ({ prop: value } as Type); });',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toHaveLength(1);
    expect(actual.output).toBe(input);
  });

  it("strips nested TypeScript assertion casts while autofixing", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", () => (((<{ prop: unknown }>{ prop: value }) as unknown) as Type));',
      "",
    ].join("\n");

    // Act
    const { messages, output } = runFix(input);

    // Assert
    expect(messages).toStrictEqual([]);
    expect(output).toBe(
      [
        'import type * as FileModule from "./path/to/file";',
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });
});
