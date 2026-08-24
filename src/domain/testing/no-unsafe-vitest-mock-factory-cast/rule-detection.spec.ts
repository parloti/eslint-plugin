import { describe, expect, it } from "vitest";

import { runFix } from "./__tests__/no-unsafe-vitest-mock-factory-cast-rule-test-helpers";
import { getMockFactoryMatch } from "./rule-detection";

describe("no-unsafe-vitest-mock-factory-cast rule detection", () => {
  it("exports getMockFactoryMatch", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof getMockFactoryMatch;

    // Assert
    expect(actualType).toBe(expectedType);
  });
});

describe("no-unsafe-vitest-mock-factory-cast rule (unsupported factories)", () => {
  it("does not report when the mock specifier is not statically known", () => {
    // Arrange
    const input = [
      'const specifier = "./path/to/file";',
      "vi.mock(specifier, () => ({ prop: value } as Type));",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when vi.mock receives spread arguments", () => {
    // Arrange
    const input = [
      'const args = ["./path/to/file", () => ({ prop: value } as Type)] as const;',
      "vi.mock(...args);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when the mock factory argument is spread", () => {
    // Arrange
    const input = [
      "const factoryArgs = [() => ({ prop: value } as Type)] as const;",
      'vi.mock("./path/to/file", ...factoryArgs);',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when the factory does not return a cast", () => {
    // Arrange
    const input = [
      'vi.doMock(import("./path/to/file"), () => ({ prop: value }));',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when arrow factory expression body is not a cast", () => {
    // Arrange
    const input = ['vi.mock("./path/to/file", () => value);', ""].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when the factory node is not a function expression", () => {
    // Arrange
    const input = [
      "const factory = () => ({ prop: value } as Type);",
      'vi.mock("./path/to/file", factory);',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when a function factory has no return statement", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", function () { setup(); });',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when a single return statement has no argument", () => {
    // Arrange
    const input = ['vi.mock("./path/to/file", () => { return; });', ""].join(
      "\n",
    );

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });
});
