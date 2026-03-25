import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ESLint } from "eslint";
import { parser } from "typescript-eslint";
import { afterEach, describe, expect, it } from "vitest";

import { preferVitestIncrementalCastsRule } from "./rule";

interface FixRunResult {
  messages: Awaited<ReturnType<ESLint["lintText"]>>[number]["messages"];
  output: string;
}

const tempDirectories: string[] = [];

const declarationText = [
  'declare module "fixture-module" {',
  "  export const configs: { disableTypeChecked: { rules: string[]; strict: boolean } };",
  "  export const extra: number;",
  "  export const parser: { parseForESLint(code: string): { ast: string } };",
  "  export const plugin: { meta: { name: string } };",
  "}",
  "",
  "declare const vi: {",
  '  doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => typeof import("fixture-module")): void;',
  '  doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => Partial<typeof import("fixture-module")>): void;',
  '  doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => Promise<Partial<typeof import("fixture-module")>>): void;',
  '  mock(specifier: Promise<typeof import("fixture-module")>, factory: () => typeof import("fixture-module")): void;',
  '  mock(specifier: Promise<typeof import("fixture-module")>, factory: () => Partial<typeof import("fixture-module")>): void;',
  '  mock(specifier: Promise<typeof import("fixture-module")>, factory: (importOriginal: () => Promise<typeof import("fixture-module")>) => Promise<Partial<typeof import("fixture-module")>>): void;',
  "};",
  "",
].join("\n");

async function runFix(
  code: string,
  customDeclarationText = declarationText,
): Promise<FixRunResult> {
  const tempDirectory = await mkdtemp(join(tmpdir(), "codeperfect-rule-"));
  const filePath = join(tempDirectory, "example.spec.ts");
  const tsconfigPath = join(tempDirectory, "tsconfig.json");

  tempDirectories.push(tempDirectory);

  await writeFile(
    join(tempDirectory, "globals.d.ts"),
    customDeclarationText,
    "utf8",
  );
  await writeFile(
    tsconfigPath,
    JSON.stringify(
      {
        compilerOptions: {
          module: "esnext",
          moduleResolution: "bundler",
          noEmit: true,
          strict: true,
          target: "esnext",
        },
        include: ["**/*.ts", "**/*.d.ts"],
      },
      null,
      2,
    ),
    "utf8",
  );
  await writeFile(filePath, code, "utf8");

  const eslint = new ESLint({
    cwd: tempDirectory,
    fix: true,
    ignore: false,
    overrideConfig: [
      {
        files: ["**/*.ts"],
        languageOptions: {
          parser,
          parserOptions: {
            ecmaVersion: 2022,
            project: [tsconfigPath],
            sourceType: "module",
            tsconfigRootDir: tempDirectory,
          },
        },
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

  const [result] = await eslint.lintText(code, { filePath });

  if (result === void 0) {
    throw new Error("Expected ESLint to return a lint result.");
  }

  return {
    messages: result.messages,
    output: result.output ?? (await readFile(filePath, { encoding: "utf8" })),
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirectories
      .splice(0)
      .map(async (directory) =>
        rm(directory, { force: true, recursive: true }),
      ),
  );
});

describe("prefer-vitest-incremental-casts rule", () => {
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

  it("does not report direct non-string module specifiers", async () => {
    // Arrange
    const customDeclarationText = [
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
    const actual = await runFix(input, customDeclarationText);

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
    const customDeclarationText = [
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
    const { output } = await runFix(input, customDeclarationText);

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

  it("does not report numeric property names that do not exist on the target module", async () => {
    // Arrange
    const customDeclarationText = [
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
    const actual = await runFix(input, customDeclarationText);

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

  it("does not report when fallback signature analysis cannot resolve an object target", async () => {
    // Arrange
    const customDeclarationText = [
      'declare module "fixture-module" {',
      "  export const configs: { disableTypeChecked: { rules: string[]; strict: boolean } };",
      "  export const extra: number;",
      "  export const parser: { parseForESLint(code: string): { ast: string } };",
      "  export const plugin: { meta: { name: string } };",
      "}",
      "",
      "declare const vi: {",
      '  doMock(specifier: Promise<typeof import("fixture-module")>): void;',
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
    const actual = await runFix(input, customDeclarationText);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report unions with multiple object-like branches", async () => {
    // Arrange
    const customDeclarationText = [
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
    const actual = await runFix(input, customDeclarationText);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("adds an outer cast when the resolved target type is callable", async () => {
    // Arrange
    const customDeclarationText = [
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
    const { output } = await runFix(input, customDeclarationText);

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
    const customDeclarationText = [
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
    const { output } = await runFix(input, customDeclarationText);

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
}, 30_000);
