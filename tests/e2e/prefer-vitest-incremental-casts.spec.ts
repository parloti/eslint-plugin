import { afterAll, describe, expect, it } from "vitest";

import { cleanupTemporaryDirectories, runFix } from "../support";

describe(
  "prefer-vitest-incremental-casts e2e",
  { timeout: Number.parseInt("30000", 10) },
  () => {
    afterAll(cleanupTemporaryDirectories);

    it("fixes broad module casts into incremental casts", async () => {
      // Arrange
      const code = [
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        'vi.doMock(import("fixture-module"), () => ({',
        "  configs: { disableTypeChecked } as Record<string, unknown>,",
        '  parser: parser as unknown as typeof import("fixture-module")["parser"],',
        "  plugin,",
        '} as unknown as typeof import("fixture-module")));',
        "",
      ].join("\n");
      const output = [
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
      ].join("\n");

      // Act
      const result = await runFix(code);

      // Assert
      expect(result.messages).toStrictEqual([]);
      expect(result.output).toBe(output);
    });

    it("accepts incremental casts that preserve the imported module shape", async () => {
      // Arrange
      const code = [
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
      ].join("\n");

      // Act
      const result = await runFix(code);

      // Assert
      expect(result.messages).toStrictEqual([]);
      expect(result.output).toBe(code);
    });

    it("isolates concurrent typed fixture runs in the e2e helper path", async () => {
      // Arrange
      const broadCastInput = [
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        'vi.doMock(import("fixture-module"), () => ({',
        "  configs: { disableTypeChecked } as Record<string, unknown>,",
        '  parser: parser as unknown as typeof import("fixture-module")["parser"],',
        "  plugin,",
        '} as unknown as typeof import("fixture-module")));',
        "",
      ].join("\n");
      const incrementalInput = [
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
      ].join("\n");

      // Act
      const [broadCastResult, incrementalResult] = await Promise.all([
        runFix(broadCastInput),
        runFix(incrementalInput),
      ]);

      // Assert
      expect(broadCastResult.output).toContain(
        'configs: { disableTypeChecked } as typeof import("fixture-module")["configs"]',
      );
      expect(incrementalResult.messages).toStrictEqual([]);
      expect(incrementalResult.output).toBe(incrementalInput);
    });
  },
);
