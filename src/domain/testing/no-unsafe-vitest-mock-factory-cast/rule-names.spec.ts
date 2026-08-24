import { describe, expect, it } from "vitest";

import { runFix } from "./__tests__/no-unsafe-vitest-mock-factory-cast-rule-test-helpers";
import { collectTopLevelNames } from "./rule-names";

describe("no-unsafe-vitest-mock-factory-cast rule names", () => {
  it("exports collectTopLevelNames", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof collectTopLevelNames;

    // Assert
    expect(actualType).toBe(expectedType);
  });
});

describe("no-unsafe-vitest-mock-factory-cast rule (namespace collisions)", () => {
  it("generates a unique namespace when the preferred one is already taken", () => {
    // Arrange
    const input = [
      "const FileModule = 1;",
      "const { alias = 2, nested: { inner } } = data;",
      "const { keep, ...restObject } = data;",
      "const [first, ...rest] = list;",
      "export function exportedThing() {}",
      "export class ExportedClass {}",
      "",
      'vi.mock("./path/to/file", () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import type * as FileModule1 from "./path/to/file";',
        "",
        "const FileModule = 1;",
        "const { alias = 2, nested: { inner } } = data;",
        "const { keep, ...restObject } = data;",
        "const [first, ...rest] = list;",
        "export function exportedThing() {}",
        "export class ExportedClass {}",
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule1>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("generates a unique namespace when exports and type declarations collide", () => {
    // Arrange
    const input = [
      "export const FileModule = 1;",
      "type FileModule1 = { ready: true };",
      "",
      'vi.mock("./path/to/file", () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import type * as FileModule2 from "./path/to/file";',
        "",
        "export const FileModule = 1;",
        "type FileModule1 = { ready: true };",
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule2>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("does not crash when collecting names from anonymous default exports", () => {
    // Arrange
    const input = [
      "export default function () {}",
      "",
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
        "export default function () {}",
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("does not crash when collecting names from anonymous default class exports", () => {
    // Arrange
    const input = [
      "export default class {}",
      "",
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
        "export default class {}",
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });
});
