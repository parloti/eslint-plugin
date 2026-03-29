import { afterEach, describe, expect, it } from "vitest";

import { cleanupTemporaryDirectories, runFix } from "./rule-test-helpers";
import { ruleInputShapesSuiteName } from "./rule.input-shapes";

describe(
  ruleInputShapesSuiteName,
  () => {
    afterEach(cleanupTemporaryDirectories);

    it("does not report direct non-string module specifiers", async () => {
      // Arrange
      const declarationText = [
        'declare module "fixture-module" {',
        "  export const configs: { disableTypeChecked: { rules: string[]; strict: boolean } };",
        "  export const parser: { parseForESLint(code: string): { ast: string } };",
        "  export const plugin: { meta: { name: string } };",
        "}",
        "",
        "declare const vi: {",
        '  doMock(specifier: never, factory: () => Partial<typeof import("fixture-module")>): void;',
        "};",
        "",
      ].join("\n");
      const input = [
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "vi.doMock(123 as never, () => ({",
        "  configs: { disableTypeChecked },",
        "  parser,",
        "  plugin,",
        "}));",
        "",
      ].join("\n");

      // Act
      const actual = await runFix(input, declarationText);

      // Assert
      expect(actual.messages).toStrictEqual([]);
      expect(actual.output).toBe(input);
    });

    it("does not report spread-heavy factories in the first pass", async () => {
      // Arrange
      const input = [
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "const actual = { plugin };",
        "",
        'vi.mock(import("fixture-module"), async () => ({',
        "  ...actual,",
        "  configs: { disableTypeChecked },",
        "  parser,",
        "}));",
        "",
      ].join("\n");

      // Act
      const actual = await runFix(input);

      // Assert
      expect(actual.messages).toStrictEqual([]);
      expect(actual.output).toBe(input);
    });

    it("supports function-expression factories with string module specifiers and quoted keys", async () => {
      // Arrange
      const declarationText = [
        'declare module "fixture-module" {',
        "  export const configs: { disableTypeChecked: { rules: string[]; strict: boolean } };",
        "  export const extra: number;",
        "  export const parser: { parseForESLint(code: string): { ast: string } };",
        "  export const plugin: { meta: { name: string } };",
        "}",
        "",
        "declare const vi: {",
        '  doMock(specifier: "fixture-module", factory: () => Partial<typeof import("fixture-module")>): void;',
        "};",
        "",
      ].join("\n");
      const input = [
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        'vi.doMock("fixture-module", function () {',
        "  return {",
        '    "configs": { disableTypeChecked },',
        "    parser,",
        "    plugin,",
        "  };",
        "});",
        "",
      ].join("\n");

      // Act
      const { output } = await runFix(input, declarationText);

      // Assert
      expect(output).toBe(
        [
          "const disableTypeChecked = { rules: [] as string[] };",
          'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
          'const plugin = { meta: { name: "fixture" } };',
          "",
          'vi.doMock("fixture-module", function () {',
          "  return {",
          '    "configs": { disableTypeChecked } as typeof import("fixture-module")["configs"],',
          "    parser,",
          "    plugin,",
          "  };",
          "});",
          "",
        ].join("\n"),
      );
    });

    it("unwraps deeply parenthesized passthrough property values", async () => {
      // Arrange
      const input = [
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        'vi.doMock(import("fixture-module"), () => ({',
        "  configs: { disableTypeChecked },",
        "  parser: (((parser))),",
        "  plugin,",
        "}));",
        "",
      ].join("\n");

      // Act
      const { output } = await runFix(input);

      // Assert
      expect(output).toBe(
        [
          "const disableTypeChecked = { rules: [] as string[] };",
          'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
          'const plugin = { meta: { name: "fixture" } };',
          "",
          'vi.doMock(import("fixture-module"), () => ({',
          '  configs: { disableTypeChecked } as typeof import("fixture-module")["configs"],',
          "  parser,",
          "  plugin,",
          "}));",
          "",
        ].join("\n"),
      );
    });

    it("does not report numeric property names that do not exist on the target module", async () => {
      // Arrange
      const declarationText = [
        'declare module "fixture-module" {',
        "  export const configs: { disableTypeChecked: { rules: string[]; strict: boolean } };",
        "  export const extra: number;",
        "  export const parser: { parseForESLint(code: string): { ast: string } };",
        "  export const plugin: { meta: { name: string } };",
        "}",
        "",
        "declare const vi: {",
        '  doMock(specifier: "fixture-module", factory: () => Partial<typeof import("fixture-module")>): void;',
        "};",
        "",
      ].join("\n");
      const input = [
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        'vi.doMock("fixture-module", () => ({',
        "  0: parser,",
        "  plugin,",
        "}));",
        "",
      ].join("\n");

      // Act
      const actual = await runFix(input, declarationText);

      // Assert
      expect(actual.messages).toStrictEqual([]);
      expect(actual.output).toBe(input);
    });

    it("does not report literal property keys that cannot map to module members", async () => {
      // Arrange
      const input = [
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        'vi.doMock(import("fixture-module"), () => ({',
        "  1n: parser,",
        "  plugin,",
        "}));",
        "",
      ].join("\n");

      // Act
      const actual = await runFix(input);

      // Assert
      expect(actual.messages).toStrictEqual([]);
      expect(actual.output).toBe(input);
    });
  },
  30_000,
);
