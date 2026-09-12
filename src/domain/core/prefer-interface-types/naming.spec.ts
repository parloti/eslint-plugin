import { describe, expect, it } from "vitest";

import { runFix } from "./__tests__/prefer-interface-types-autofix-test-helpers";

describe("prefer interface types generated names", () => {
  it("uses static method keys and anonymous fallbacks", () => {
    // Arrange
    const code = [
      "interface Service {",
      '  "load_data"(): { loaded: boolean };',
      "  42(): { count: number };",
      "  (): { called: boolean };",
      "}",
      'const [callback] = [(): { value: string } => ({ value: "x" })];',
    ].join("\n");

    // Act
    const actualOutput = runFix(code).output;

    // Assert
    expect(actualOutput).toContain('"load_data"(): LoadData');
    expect(actualOutput).toContain("42(): Type");
    expect(actualOutput).toContain("(): Type1");
    expect(actualOutput).toContain("[(): Type2 =>");
  });

  it("falls back when an identifier has no ASCII name characters", () => {
    // Arrange
    const code = 'const $: { value: string } = { value: "x" };';

    // Act
    const actualOutput = runFix(code).output;

    // Assert
    expect(actualOutput).toContain("const $: Type =");
    expect(actualOutput).toContain("interface Type { value: string }");
  });
});
