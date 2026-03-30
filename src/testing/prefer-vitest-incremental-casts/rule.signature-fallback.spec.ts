import { afterAll, describe, expect, it } from "vitest";

import { cleanupTemporaryDirectories, runFix } from "./rule-test-helpers";
import { ruleSignatureFallbackSuiteName } from "./rule.signature-fallback";

describe(
  ruleSignatureFallbackSuiteName,
  () => {
    afterAll(cleanupTemporaryDirectories);

    it("uses the call-signature fallback when contextual typing is unavailable", async () => {
      // Arrange
      const input = [
        'const vi: { doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => typeof import("fixture-module")): void } = undefined as never;',
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        'vi.doMock(import("fixture-module"), (): unknown => (({',
        "  configs: { disableTypeChecked },",
        "  parser,",
        "  plugin,",
        "})));",
        "",
      ].join("\n");

      // Act
      const { output } = await runFix(input);

      // Assert
      expect(output).toBe(
        [
          'const vi: { doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => typeof import("fixture-module")): void } = undefined as never;',
          "const disableTypeChecked = { rules: [] as string[] };",
          'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
          'const plugin = { meta: { name: "fixture" } };',
          "",
          'vi.doMock(import("fixture-module"), (): unknown => ((({',
          '  configs: { disableTypeChecked } as typeof import("fixture-module")["configs"],',
          "  parser,",
          "  plugin,",
          '}) as typeof import("fixture-module"))));',
          "",
        ].join("\n"),
      );
    });

    it("handles union contextual return types that contain a single object-like branch", async () => {
      // Arrange
      const input = [
        'const vi: { doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => Partial<typeof import("fixture-module")> | undefined): void } = undefined as never;',
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        'vi.doMock(import("fixture-module"), () => ({',
        "  configs: { disableTypeChecked },",
        "  parser,",
        "  plugin,",
        "}));",
        "",
      ].join("\n");

      // Act
      const { output } = await runFix(input);

      // Assert
      expect(output).toBe(
        [
          'const vi: { doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => Partial<typeof import("fixture-module")> | undefined): void } = undefined as never;',
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

    it("does not report when the resolved factory target type is not object-like", async () => {
      // Arrange
      const input = [
        'const vi: { doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => string | number): void } = undefined as never;',
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        'vi.doMock(import("fixture-module"), () => ({',
        "  configs: { disableTypeChecked },",
        "  parser,",
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

    it("does not report when fallback signature analysis cannot resolve an object target", async () => {
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
        '  doMock(specifier: Promise<typeof import("fixture-module")): void;',
        '  doMock(specifier: "other-module", factory: () => string | number): void;',
        "};",
        "",
      ].join("\n");
      const input = [
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        'vi.doMock(import("fixture-module"), (): unknown => ({',
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

    it("does not report unions with multiple object-like branches", async () => {
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
        '  doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => { configs: typeof import("fixture-module")["configs"] } | { parser: typeof import("fixture-module")["parser"] }): void;',
        "};",
        "",
      ].join("\n");
      const input = [
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        'vi.doMock(import("fixture-module"), () => ({',
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

    it("adds an outer cast when the resolved target type is callable", async () => {
      // Arrange
      const declarationText = [
        'declare module "fixture-module" {',
        "  export const configs: { disableTypeChecked: { rules: string[]; strict: boolean } };",
        "  export const extra: number;",
        "  export const parser: { parseForESLint(code: string): { ast: string } };",
        "  export const plugin: { meta: { name: string } };",
        "}",
        "",
        "type CallableFixture = (() => void) & {",
        '  configs: typeof import("fixture-module")["configs"];',
        '  parser: typeof import("fixture-module")["parser"];',
        '  plugin: typeof import("fixture-module")["plugin"];',
        "};",
        "",
        "declare const vi: {",
        '  doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => CallableFixture): void;',
        "};",
        "",
      ].join("\n");
      const input = [
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        'vi.doMock(import("fixture-module"), () => ({',
        "  configs: { disableTypeChecked },",
        "  parser,",
        "  plugin,",
        "}));",
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
          'vi.doMock(import("fixture-module"), () => (({',
          '  configs: { disableTypeChecked } as typeof import("fixture-module")["configs"],',
          "  parser,",
          "  plugin,",
          '}) as typeof import("fixture-module")));',
          "",
        ].join("\n"),
      );
    });

    it("adds an outer cast when the resolved target type is constructable", async () => {
      // Arrange
      const declarationText = [
        'declare module "fixture-module" {',
        "  export const configs: { disableTypeChecked: { rules: string[]; strict: boolean } };",
        "  export const extra: number;",
        "  export const parser: { parseForESLint(code: string): { ast: string } };",
        "  export const plugin: { meta: { name: string } };",
        "}",
        "",
        "type ConstructableFixture = {",
        "  new (): unknown;",
        '  configs: typeof import("fixture-module")["configs"];',
        '  parser: typeof import("fixture-module")["parser"];',
        '  plugin: typeof import("fixture-module")["plugin"];',
        "};",
        "",
        "declare const vi: {",
        '  doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => ConstructableFixture): void;',
        "};",
        "",
      ].join("\n");
      const input = [
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        'vi.doMock(import("fixture-module"), () => ({',
        "  configs: { disableTypeChecked },",
        "  parser,",
        "  plugin,",
        "}));",
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
          'vi.doMock(import("fixture-module"), () => (({',
          '  configs: { disableTypeChecked } as typeof import("fixture-module")["configs"],',
          "  parser,",
          "  plugin,",
          '}) as typeof import("fixture-module")));',
          "",
        ].join("\n"),
      );
    });
  },
  30_000,
);
