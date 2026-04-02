import { afterAll, describe, expect, it } from "vitest";

import { cleanupTemporaryDirectories, runFix } from "./rule-test-helpers";

describe("prefer-vitest-incremental-casts rule", () => {
  afterAll(cleanupTemporaryDirectories);

  it("casts only the mismatching properties inside a simple vi.doMock factory", async () => {
    // Arrange
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

  it("removes dirty broad casts and rebuilds the minimal nested cast form", async () => {
    // Arrange
    const input = [
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

    // Act
    const { output } = await runFix(input);

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

  it("supports block-bodied vi.mock factories", async () => {
    // Arrange
    const input = [
      "const disableTypeChecked = { rules: [] as string[] };",
      'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
      'const plugin = { meta: { name: "fixture" } };',
      "",
      'vi.mock(import("fixture-module"), () => {',
      "  return {",
      "    configs: { disableTypeChecked },",
      "    parser,",
      "    plugin,",
      "  };",
      "});",
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
        'vi.mock(import("fixture-module"), () => {',
        "  return ({",
        '    configs: { disableTypeChecked } as typeof import("fixture-module")["configs"],',
        "    parser,",
        "    plugin,",
        '  }) as typeof import("fixture-module");',
        "});",
        "",
      ].join("\n"),
    );
  });

  it("supports async factories without touching assignable passthroughs", async () => {
    // Arrange
    const input = [
      "const disableTypeChecked = { rules: [] as string[] };",
      'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
      'const plugin = { meta: { name: "fixture" } };',
      "",
      'vi.mock(import("fixture-module"), async (importOriginal) => {',
      "  await importOriginal();",
      "  return {",
      "    configs: { disableTypeChecked },",
      "    parser,",
      "    plugin,",
      "  };",
      "});",
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
        'vi.mock(import("fixture-module"), async (importOriginal) => {',
        "  await importOriginal();",
        "  return {",
        '    configs: { disableTypeChecked } as typeof import("fixture-module")["configs"],',
        "    parser,",
        "    plugin,",
        "  };",
        "});",
        "",
      ].join("\n"),
    );
  });

  it("collapses parenthesized passthrough properties back to the minimal shorthand form", async () => {
    // Arrange
    const input = [
      "const disableTypeChecked = { rules: [] as string[] };",
      'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
      'const plugin = { meta: { name: "fixture" } };',
      "",
      'vi.doMock(import("fixture-module"), () => ({',
      "  configs: { disableTypeChecked },",
      "  parser: (parser),",
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

  it("rewrites parenthesized implicit object returns without adding an outer cast when partial targets allow it", async () => {
    // Arrange
    const input = [
      "const disableTypeChecked = { rules: [] as string[] };",
      'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
      'const plugin = { meta: { name: "fixture" } };',
      "",
      'vi.doMock(import("fixture-module"), () => (({',
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
        "const disableTypeChecked = { rules: [] as string[] };",
        'const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };',
        'const plugin = { meta: { name: "fixture" } };',
        "",
        'vi.doMock(import("fixture-module"), () => (({',
        '  configs: { disableTypeChecked } as typeof import("fixture-module")["configs"],',
        "  parser,",
        "  plugin,",
        "})));",
        "",
      ].join("\n"),
    );
  });
}, 30_000);
