import { ESLint } from "eslint";
import { afterEach, describe, expect, it } from "vitest";

import { preferVitestIncrementalCastsRule } from "./rule";
import { cleanupTemporaryDirectories, runFix } from "./rule-test-helpers";
import { ruleGuardrailsSuiteName } from "./rule.guardrails";

describe(
  ruleGuardrailsSuiteName,
  () => {
    afterEach(cleanupTemporaryDirectories);

    it("ignores non-vitest calls", async () => {
      // Arrange
      const input = [
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        'mock(import("fixture-module"), () => ({',
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

    it("does not report non-function factory arguments", async () => {
      // Arrange
      const input = [
        'vi.doMock(import("fixture-module"), undefined as never);',
        "",
      ].join("\n");

      // Act
      const actual = await runFix(input);

      // Assert
      expect(actual.messages).toStrictEqual([]);
      expect(actual.output).toBe(input);
    });

    it("does not report calls without a factory argument", async () => {
      // Arrange
      const input = ['vi.doMock(import("fixture-module"));', ""].join("\n");

      // Act
      const actual = await runFix(input);

      // Assert
      expect(actual.messages).toStrictEqual([]);
      expect(actual.output).toBe(input);
    });

    it("does not report factories without return statements", async () => {
      // Arrange
      const input = [
        'vi.doMock(import("fixture-module"), () => {',
        '  const parser = "unused";',
        "  void parser;",
        "});",
        "",
      ].join("\n");

      // Act
      const actual = await runFix(input);

      // Assert
      expect(actual.messages).toStrictEqual([]);
      expect(actual.output).toBe(input);
    });

    it("does not report factories that return non-object expressions", async () => {
      // Arrange
      const input = [
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'vi.doMock(import("fixture-module"), () => parser);',
        "",
      ].join("\n");

      // Act
      const actual = await runFix(input);

      // Assert
      expect(actual.messages).toStrictEqual([]);
      expect(actual.output).toBe(input);
    });

    it("does not report dynamic import specifiers that are not string literals", async () => {
      // Arrange
      const input = [
        'const moduleSpecifier = "fixture-module";',
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        "vi.doMock(import(moduleSpecifier), () => ({",
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

    it("does not report spread call arguments", async () => {
      // Arrange
      const input = [
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        'const args = [import("fixture-module"), () => ({ configs: { disableTypeChecked }, parser, plugin })] as const;',
        "vi.doMock(...args);",
        "",
      ].join("\n");

      // Act
      const actual = await runFix(input);

      // Assert
      expect(actual.messages).toStrictEqual([]);
      expect(actual.output).toBe(input);
    });

    it("does not throw when parser services are unavailable", async () => {
      // Arrange
      const eslint = new ESLint({
        fix: true,
        ignore: false,
        overrideConfig: [
          {
            files: ["**/*.js"],
            plugins: {
              codeperfect: {
                rules: {
                  "prefer-vitest-incremental-casts":
                    preferVitestIncrementalCastsRule,
                },
              },
            },
            rules: {
              "codeperfect/prefer-vitest-incremental-casts": "error",
            },
          },
        ],
        overrideConfigFile: true,
      });

      // Act
      const [result] = await eslint.lintText(
        'vi.doMock("fixture-module", () => ({ parser: { parseForESLint() {} } }));',
        { filePath: "example.js" },
      );

      // Assert
      expect(result?.messages).toStrictEqual([]);
    });
  },
  30_000,
);
