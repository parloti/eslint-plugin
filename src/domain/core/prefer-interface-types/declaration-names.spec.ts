import { describe, expect, it } from "vitest";

import { runFix } from "./__tests__/prefer-interface-types-autofix-test-helpers";

describe("prefer interface types declaration collisions", () => {
  it("reserves exported and destructured top-level value names", () => {
    // Arrange
    const code = [
      "declare const values: unknown[];",
      "declare const objectValue: Record<string, unknown>;",
      "export const [Input = values[0], , ...Input1] = values;",
      "export const { value: Input2, ...Input3 } = objectValue;",
      "export default function Input4(): void {}",
      "export { Input4 };",
      "function demo(input: { value: string }): void {}",
    ].join("\n");

    // Act
    const actualOutput = runFix(code).output;

    // Assert
    expect(actualOutput).toContain("function demo(input: Input5)");
    expect(actualOutput).toContain("interface Input5 { value: string }");
  });
});
