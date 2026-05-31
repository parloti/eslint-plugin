import { Linter } from "eslint";
import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import { noUnsafeVitestMockFactoryCastRule } from "./rule";

/** Rule test output shape. */
interface FixRunResult {
  /** Lint messages produced during the run. */
  messages: Linter.LintMessage[];

  /** Fixed source output. */
  output: string;
}

/**
 * Runs the rule with autofix enabled.
 * @param code Source code to lint.
 * @returns Rule messages and fixed output.
 * @example
 * ```typescript
 * const result = runFix('vi.mock("./x", () => ({ a: 1 } as T));\n');
 * ```
 */
const runFix = (code: string): FixRunResult => {
  const linter = new Linter({ configType: "flat" });

  const result = linter.verifyAndFix(
    code,
    [
      {
        files: ["**/*.ts"],
        languageOptions: {
          ecmaVersion: 2022,
          parser,
          parserOptions: { range: true },
          sourceType: "module",
        },
        plugins: {
          codeperfect: {
            rules: {
              "no-unsafe-vitest-mock-factory-cast":
                noUnsafeVitestMockFactoryCastRule,
            },
          },
        },
        rules: {
          "codeperfect/no-unsafe-vitest-mock-factory-cast": "error",
        },
      },
    ],
    { filename: "example.spec.ts" },
  );

  return { messages: result.messages, output: result.output };
};

describe("no-unsafe-vitest-mock-factory-cast rule", () => {
  it("replaces a casted vi.mock factory with createMockProxy and a type import", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const { messages, output } = runFix(input);

    // Assert
    expect(messages).toStrictEqual([]);
    expect(output).toBe(
      [
        'import type * as FileModule from "./path/to/file";',
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("supports vi.doMock and nested casts", () => {
    // Arrange
    const input = [
      'vi.doMock(import("./path/to/file"), () => ((({ prop: value } as unknown) as Type)));',
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import type * as FileModule from "./path/to/file";',
        "",
        'vi.doMock(import("./path/to/file"), createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("supports function-expression factories", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", function () { return ({ prop: value } as Type); });',
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import type * as FileModule from "./path/to/file";',
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("reuses an existing type import when present", () => {
    // Arrange
    const input = [
      'import type * as FileModule from "./path/to/file";',
      "",
      'vi.mock("./path/to/file", () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import type * as FileModule from "./path/to/file";',
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("generates a unique namespace when the preferred one is already taken", () => {
    // Arrange
    const input = [
      "const FileModule = 1;",
      "const { alias = 2, nested: { inner } } = data;",
      "const { keep, ...restObject } = data;",
      "const [first, ...rest] = list;",
      "export function exportedThing() {}",
      "export class ExportedClass {}",
      "",
      'vi.mock("./path/to/file", () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import type * as FileModule1 from "./path/to/file";',
        "",
        "const FileModule = 1;",
        "const { alias = 2, nested: { inner } } = data;",
        "const { keep, ...restObject } = data;",
        "const [first, ...rest] = list;",
        "export function exportedThing() {}",
        "export class ExportedClass {}",
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule1>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("does not report when the mock specifier is not statically known", () => {
    // Arrange
    const input = [
      'const specifier = "./path/to/file";',
      "vi.mock(specifier, () => ({ prop: value } as Type));",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when vi.mock receives spread arguments", () => {
    // Arrange
    const input = [
      'const args = ["./path/to/file", () => ({ prop: value } as Type)] as const;',
      "vi.mock(...args);",
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when the mock factory argument is spread", () => {
    // Arrange
    const input = [
      "const factoryArgs = [() => ({ prop: value } as Type)] as const;",
      'vi.mock("./path/to/file", ...factoryArgs);',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when the factory does not return a cast", () => {
    // Arrange
    const input = [
      'vi.doMock(import("./path/to/file"), () => ({ prop: value }));',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when arrow factory expression body is not a cast", () => {
    // Arrange
    const input = ['vi.mock("./path/to/file", () => value);', ""].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when the factory node is not a function expression", () => {
    // Arrange
    const input = [
      "const factory = () => ({ prop: value } as Type);",
      'vi.mock("./path/to/file", factory);',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("reports but does not autofix async factories", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", async () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toHaveLength(1);
    expect(actual.output).toBe(input);
  });

  it("reports but does not autofix function-expression factories with parameters", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", function (ctx) { return ({ prop: value } as Type); });',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toHaveLength(1);
    expect(actual.output).toBe(input);
  });

  it("supports factories using TypeScript assertion syntax", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", () => (<Type>{ prop: value }));',
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import type * as FileModule from "./path/to/file";',
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("reports but does not autofix factories with side effects", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", () => { setup(); return ({ prop: value } as Type); });',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toHaveLength(1);
    expect(actual.output).toBe(input);
  });

  it("does not report when a function factory has no return statement", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", function () { setup(); });',
      "",
    ].join("\n");

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("does not report when a single return statement has no argument", () => {
    // Arrange
    const input = ['vi.mock("./path/to/file", () => { return; });', ""].join(
      "\n",
    );

    // Act
    const actual = runFix(input);

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.output).toBe(input);
  });

  it("strips nested TypeScript assertion casts while autofixing", () => {
    // Arrange
    const input = [
      'vi.mock("./path/to/file", () => (((<{ prop: unknown }>{ prop: value }) as unknown) as Type));',
      "",
    ].join("\n");

    // Act
    const { messages, output } = runFix(input);

    // Assert
    expect(messages).toStrictEqual([]);
    expect(output).toBe(
      [
        'import type * as FileModule from "./path/to/file";',
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("generates a unique namespace when exports and type declarations collide", () => {
    // Arrange
    const input = [
      "export const FileModule = 1;",
      "type FileModule1 = { ready: true };",
      "",
      'vi.mock("./path/to/file", () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import type * as FileModule2 from "./path/to/file";',
        "",
        "export const FileModule = 1;",
        "type FileModule1 = { ready: true };",
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule2>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("inserts the type import after existing imports", () => {
    // Arrange
    const input = [
      'import { something } from "./other";',
      "",
      'vi.mock("./path/to/file", () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const { output } = runFix(input);

    // Assert
    expect(output).toBe(
      [
        'import { something } from "./other";',
        'import type * as FileModule from "./path/to/file";',
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("does not crash when collecting names from anonymous default exports", () => {
    // Arrange
    const input = [
      "export default function () {}",
      "",
      'vi.mock("./path/to/file", () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const { messages, output } = runFix(input);

    // Assert
    expect(messages).toStrictEqual([]);
    expect(output).toBe(
      [
        'import type * as FileModule from "./path/to/file";',
        "",
        "export default function () {}",
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });

  it("does not crash when collecting names from anonymous default class exports", () => {
    // Arrange
    const input = [
      "export default class {}",
      "",
      'vi.mock("./path/to/file", () => ({ prop: value } as Type));',
      "",
    ].join("\n");

    // Act
    const { messages, output } = runFix(input);

    // Assert
    expect(messages).toStrictEqual([]);
    expect(output).toBe(
      [
        'import type * as FileModule from "./path/to/file";',
        "",
        "export default class {}",
        "",
        'vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));',
        "",
      ].join("\n"),
    );
  });
});
