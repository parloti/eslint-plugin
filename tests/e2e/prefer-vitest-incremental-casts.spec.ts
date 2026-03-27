import { afterAll } from "vitest";

import { preferVitestIncrementalCastsRule } from "../../src";
import { createRuleTester } from "../support/rule-tester";
import { createTemporaryFixtureManager } from "../support/temporary-fixtures";

/**
 *
 */
const ruleTester = createRuleTester();

/**
 *
 */
const declarationText = [
  'declare module "fixture-module" {',
  "  export const configs: { disableTypeChecked: { rules: string[]; strict: boolean } };",
  "  export const parser: { parseForESLint(code: string): { ast: string } };",
  "  export const plugin: { meta: { name: string } };",
  "}",
  "",
  "declare const vi: {",
  '  doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => typeof import("fixture-module")): void;',
  '  doMock(specifier: Promise<typeof import("fixture-module")>, factory: () => Partial<typeof import("fixture-module")>): void;',
  "};",
  "",
].join("\n");

/**
 *
 */
const tsconfigText = JSON.stringify(
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
);

/**
 *
 */
const { cleanupTemporaryDirectories, createFixtureSet } =
  createTemporaryFixtureManager();

afterAll(cleanupTemporaryDirectories);

/**
 * @param code
 * @example
 */
const createTypeAwareCase = (code: string) => {
  const fixtureSet = createFixtureSet({
    "example.spec.ts": code,
    "globals.d.ts": declarationText,
    "tsconfig.json": tsconfigText,
  });

  return {
    code,
    filename: "example.spec.ts",
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: fixtureSet.directory,
      },
    },
  };
};

ruleTester.run(
  "prefer-vitest-incremental-casts",
  preferVitestIncrementalCastsRule,
  {
    invalid: [
      {
        ...createTypeAwareCase(
          [
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
          ].join("\n"),
        ),
        errors: [{ messageId: "preferVitestIncrementalCasts" }],
        output: [
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
      },
    ],
    valid: [
      createTypeAwareCase(
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
      ),
    ],
  },
);
