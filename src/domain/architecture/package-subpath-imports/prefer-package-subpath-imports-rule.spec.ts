import { Linter } from "eslint";
import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import {
  createPackageJson,
  withTemporaryFiles,
} from "./__tests__/package-subpath-import-test-helpers";
import { preferPackageSubpathImportsRule } from "./prefer-package-subpath-imports-rule";

/** Result returned by one rule execution. */
interface RuleRunResult {
  /** Diagnostics emitted by ESLint. */
  messages: Linter.LintMessage[];

  /** Output after applying autofixes. */
  output: string;
}

/**
 * Runs the rule against source code inside a temporary package project.
 * @param files Temporary package files keyed by POSIX-relative paths.
 * @param filename POSIX-relative linted filename.
 * @param code Source code under test.
 * @returns Lint messages and fixed output.
 * @example
 * ```typescript
 * runRule(files, "src/feature.ts", 'import "./feature";');
 * ```
 */
const runRule = (
  files: Readonly<Record<string, string>>,
  filename: string,
  code: string,
): RuleRunResult =>
  withTemporaryFiles(files, (temporaryRoot) => {
    const linter = new Linter({ configType: "flat", cwd: temporaryRoot });
    const config: Linter.Config[] = [
      {
        files: ["**/*.ts"],
        languageOptions: { ecmaVersion: 2022, parser, sourceType: "module" },
        plugins: {
          test: {
            rules: {
              "prefer-package-subpath-imports": preferPackageSubpathImportsRule,
            },
          },
        },
        rules: { "test/prefer-package-subpath-imports": "error" },
      },
    ];
    return {
      messages: linter.verify(code, config, filename),
      output: linter.verifyAndFix(code, config, filename).output,
    };
  });

describe("prefer-package-subpath-imports rule", () => {
  it("reports and fixes matching static, export, and dynamic imports", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({ "#src/*": "./src/*" }),
    };
    const code = [
      'import { value } from "../config";',
      'export { helper } from "../utils/helper";',
      'const dynamic = import("../dynamic/value");',
    ].join("\n");

    // Act
    const result = runRule(files, "src/features/consumer.ts", code);

    // Assert
    expect(result.messages.map((message) => message.messageId)).toStrictEqual([
      "usePackageImportAlias",
      "usePackageImportAlias",
      "usePackageImportAlias",
    ]);
    expect(result.output).toBe(
      [
        'import { value } from "#src/config";',
        'export { helper } from "#src/utils/helper";',
        'const dynamic = import("#src/dynamic/value");',
      ].join("\n"),
    );
  });

  it("reports and fixes export-all declarations that resolve to package aliases", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({ "#shared": "./src/shared/index.ts" }),
      "src/shared/index.ts": "export {};",
    };
    const code = 'export * from "./shared";';

    // Act
    const result = runRule(files, "src/feature.ts", code);

    // Assert
    expect(result.messages.map((message) => message.messageId)).toStrictEqual([
      "usePackageImportAlias",
    ]);
    expect(result.output).toBe('export * from "#shared";');
  });

  it("escapes quotes, backslashes, controls, and line separators in aliases", () => {
    // Arrange
    const backslash = "\\";
    const controlCharacter = "\u{1}";
    const lineSeparator = "\u{2028}";
    const aliasPattern = [
      "#special",
      "'",
      '"',
      backslash,
      controlCharacter,
      lineSeparator,
      "/*",
    ].join("");
    const escapedPrefix = [
      "#special",
      `${backslash}'`,
      `${backslash}u0022`,
      `${backslash}${backslash}`,
      `${backslash}x01`,
      `${backslash}u2028`,
    ].join("");
    const escapedDoubleQuotedPrefix = [
      "#special",
      `${backslash}u0027`,
      `${backslash}"`,
      `${backslash}${backslash}`,
      `${backslash}x01`,
      `${backslash}u2028`,
    ].join("");
    const files = {
      "package.json": createPackageJson({ [aliasPattern]: "./src/*" }),
    };
    const code = [
      "import value from './src/value';",
      'import other from "./src/other";',
    ].join("\n");

    // Act
    const result = runRule(files, "consumer.ts", code);

    // Assert
    expect(result.messages.map((message) => message.messageId)).toStrictEqual([
      "usePackageImportAlias",
      "usePackageImportAlias",
    ]);
    expect(result.output).toBe(
      [
        `import value from '${escapedPrefix}/value';`,
        `import other from "${escapedDoubleQuotedPrefix}/other";`,
      ].join("\n"),
    );
  });

  it("reports type-only imports and preserves single-quoted specifiers", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({ "#types/*": "./src/types/*" }),
    };
    const code = "import type { Shape } from '../types/shape';";

    // Act
    const result = runRule(files, "src/features/feature.ts", code);

    // Assert
    expect(result.messages).toHaveLength(1);
    expect(result.output).toBe("import type { Shape } from '#types/shape';");
  });

  it("does not report when package.json declares no imports", () => {
    // Arrange
    const files = { "package.json": '{"name":"demo"}' };
    const code = 'import { value } from "../config";';

    // Act
    const result = runRule(files, "src/features/consumer.ts", code);

    // Assert
    expect(result.messages).toStrictEqual([]);
    expect(result.output).toBe(code);
  });

  it("does not report relative paths outside the declared alias targets", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({ "#shared/*": "./src/shared/*" }),
    };
    const code = 'import { value } from "./local";';

    // Act
    const result = runRule(files, "src/features/consumer.ts", code);

    // Assert
    expect(result.messages).toStrictEqual([]);
    expect(result.output).toBe(code);
  });

  it("ignores relative imports inside the importing file's own directory", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({ "#src/*": "./src/*" }),
    };
    const code = [
      'import { sibling } from "./sibling";',
      'import { nested } from "./nested/value";',
    ].join("\n");

    // Act
    const result = runRule(files, "src/a.ts", code);

    // Assert
    expect(result.messages).toStrictEqual([]);
    expect(result.output).toBe(code);
  });

  it("reports in-directory imports for files outside the alias target", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({ "#src/*": "./src/*" }),
    };
    const code = 'import { value } from "./src/config";';

    // Act
    const result = runRule(files, "consumer.ts", code);

    // Assert
    expect(result.messages.map((message) => message.messageId)).toStrictEqual([
      "usePackageImportAlias",
    ]);
    expect(result.output).toBe('import { value } from "#src/config";');
  });

  it("reports directory imports that resolve to alias index targets", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({
        "#application": "./src/application/index.ts",
        "#domain": "./src/domain/index.ts",
      }),
      "src/application/index.ts": "export {};",
      "src/application/ports/index.ts": "export {};",
      "src/domain/index.ts": "export {};",
    };
    const code = [
      'import type { Domain } from "../../domain";',
      'import type { Ports } from "../ports";',
    ].join("\n");

    // Act
    const result = runRule(
      files,
      "src/application/download/download.mime.ts",
      code,
    );

    // Assert
    expect(result.messages.map((message) => message.messageId)).toStrictEqual([
      "usePackageImportAlias",
    ]);
    expect(result.output).toBe(
      [
        'import type { Domain } from "#domain";',
        'import type { Ports } from "../ports";',
      ].join("\n"),
    );
  });

  it("ignores non-relative specifiers, non-literal imports, and exports without sources", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({ "#src/*": "./src/*" }),
    };
    const code = [
      'import { readFileSync } from "node:fs";',
      'import { value } from "#src/config";',
      "const moduleName = '../config';",
      "const dynamic = import(moduleName);",
      "const local = 1;",
      "export { local };",
    ].join("\n");

    // Act
    const result = runRule(files, "src/features/consumer.ts", code);

    // Assert
    expect(result.messages).toStrictEqual([]);
    expect(result.output).toBe(code);
  });
});
