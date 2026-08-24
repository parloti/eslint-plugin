import { describe, expect, it } from "vitest";

import type { Declaration } from "./types";

import { runFix } from "./__tests__/prefer-vi-mocked-import-rule-test-helpers";
import { collectBindings } from "./match-bindings";

describe("prefer-vi-mocked-import match-bindings", () => {
  it("exports collectBindings", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof collectBindings;

    // Assert
    expect(actualType).toBe(expectedType);
  });

  it("ignores properties with keys that do not include a range", () => {
    // Arrange
    const bindings = {
      properties: [
        {
          computed: false,
          key: { name: "a", type: "Identifier" },
          kind: "init",
          method: false,
          range: [0, 3],
          shorthand: true,
          type: "Property",
          value: { name: "a", range: [1, 2], type: "Identifier" },
        },
      ],
      type: "ObjectExpression",
    } as never;
    const declarations = new Map<string, Declaration>([
      [
        "a",
        {
          declarationIdRange: [0, 1],
          initializerRange: [4, 10],
          localName: "a",
          statementRange: [0, 10],
        },
      ],
    ]);

    // Act
    const actualResult = collectBindings(bindings, declarations);

    // Assert
    expect(actualResult).toStrictEqual([]);
  });

  it("ignores non-property entries", () => {
    // Arrange
    const bindings = {
      properties: [
        {
          argument: { name: "a", type: "Identifier" },
          type: "SpreadElement",
        },
      ],
      type: "ObjectExpression",
    } as never;
    const declarations = new Map<string, Declaration>();

    // Act
    const actualResult = collectBindings(bindings, declarations);

    // Assert
    expect(actualResult).toStrictEqual([]);
  });

  it("ignores computed properties", () => {
    // Arrange
    const bindings = {
      properties: [
        {
          computed: true,
          key: { name: "a", range: [0, 1], type: "Identifier" },
          kind: "init",
          method: false,
          range: [0, 6],
          shorthand: false,
          type: "Property",
          value: { name: "a", range: [4, 5], type: "Identifier" },
        },
      ],
      type: "ObjectExpression",
    } as never;
    const declarations = new Map<string, Declaration>([
      [
        "a",
        {
          declarationIdRange: [0, 1],
          initializerRange: [4, 10],
          localName: "a",
          statementRange: [0, 10],
        },
      ],
    ]);

    // Act
    const actualResult = collectBindings(bindings, declarations);

    // Assert
    expect(actualResult).toStrictEqual([]);
  });
});

describe("prefer-vi-mocked-import rule (binding eligibility)", () => {
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

  it("does not report when the factory property key is computed", () => {
    // Arrange
    const input = [
      'const key = "installDevelopmentDependencies";',
      "const installDevelopmentDependencies = vi.fn();",
      'vi.mock(import("./dependencies"), () => ({ [key]: installDevelopmentDependencies }));',
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
