import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { Linter, SourceCode } from "eslint";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import * as ts from "typescript";
import { parser } from "typescript-eslint";

import { barrelFilesExportsOnlyRule } from "../exports-only-rule";
import { createProgram, createRepoDirectory } from "./test-helpers";

/** Type definition for rule data. */
interface ReportDescriptorWithMessageId {
  /** MessageId field value. */
  messageId?: string;
}

/** Type definition for rule data. */
interface RuleContextParameters {
  /** Filename field value. */
  filename: string;

  /** Options field value. */
  options: readonly unknown[];

  /** Reports field value. */
  reports: RuleReport[];

  /** SourceCode field value. */
  sourceCode: SourceCode;
}

/** Type definition for rule data. */
interface RuleReport {
  /** MessageId helper value. */
  messageId: string | undefined;
}

/** Type definition for rule data. */
interface TemporaryFileOptions {
  /** Body field value. */
  body: ESTree.Program["body"];

  /** Filename field value. */
  filename: string;

  /** Options field value. */
  options?: readonly unknown[];

  /** Root field value. */
  root: "src" | "tmp";
}

/** Type definition for rule data. */
interface TemporaryRunner {
  /** RunDefaultIndex field value. */
  runDefaultIndex: (body: ESTree.Program["body"]) => RuleReport[];

  /** RunTemporaryBarrel field value. */
  runTemporaryBarrel: (
    filename: string,
    body: ESTree.Program["body"],
    options?: readonly unknown[],
  ) => RuleReport[];

  /** RunTemporaryFeature field value. */
  runTemporaryFeature: (body: ESTree.Program["body"]) => RuleReport[];

  /** RunTemporaryIndex field value. */
  runTemporaryIndex: (body: ESTree.Program["body"]) => RuleReport[];
}

/**
 * Builds a rule context for running the rule.
 * @param parameters Context parameters and report sink.
 * @returns The ESLint rule context.
 * @example
 * ```typescript
 * const context = createRuleContext({ filename, reports, sourceCode });
 * ```
 */
const createRuleContext = (
  parameters: RuleContextParameters,
): Rule.RuleContext =>
  ({
    cwd: cwd(),
    filename: parameters.filename,
    id: "barrel-files-exports-only",
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    options: parameters.options,
    parserOptions: {},
    parserPath: void 0,
    physicalFilename: parameters.filename,
    report: (report: Rule.ReportDescriptor): void => {
      const { messageId } = report as ReportDescriptorWithMessageId;
      parameters.reports.push({ messageId });
    },
    settings: {},
    sourceCode: parameters.sourceCode,
  }) as unknown as Rule.RuleContext;

/**
 * Runs the rule against the provided AST body.
 * @param filename Target filename.
 * @param body AST program body.
 * @param options Rule options when provided.
 * @returns The captured rule reports.
 * @example
 * ```typescript
 * const reports = runRule("index.ts", createBody());
 * ```
 */
const runRule = (
  filename: string,
  body: ESTree.Program["body"],
  options: readonly unknown[] = [],
): RuleReport[] => {
  const reports: RuleReport[] = [];
  const sourceCode = new SourceCode("", createProgram(body));
  const context = createRuleContext({ filename, options, reports, sourceCode });
  const listeners = barrelFilesExportsOnlyRule.create(context);
  const programListener = listeners.Program;

  programListener?.(context.sourceCode.ast);

  return reports;
};

/**
 * Executes source in a temporary ESM package with conditional imports.
 * @param sourceText Text to lint as the barrel module contents.
 * @returns Message identifiers reported by the rule.
 * @example
 * ```typescript
 * const messages = runTypedBarrel('export * from "#conditional";');
 * ```
 */
const runTypedBarrel = (sourceText: string): string[] => {
  const temporaryRoot = path.join(cwd(), "tmp");
  mkdirSync(temporaryRoot, { recursive: true });
  const projectRoot = mkdtempSync(
    path.join(temporaryRoot, "barrel-resolution-"),
  );

  try {
    const files = {
      "node_modules/outside-package/index.d.ts":
        "export declare const outside: number;",
      "node_modules/outside-package/package.json": JSON.stringify({
        name: "outside-package",
        types: "index.d.ts",
      }),
      "package.json": JSON.stringify({
        imports: {
          "#conditional": {
            import: "./src/local.js",
            require: "outside-package",
          },
        },
        type: "module",
      }),
      "src/index.ts": sourceText,
      "src/local.ts": "export const local = 1;",
    };

    for (const [relativePath, contents] of Object.entries(files)) {
      const filename = path.join(projectRoot, relativePath);
      mkdirSync(path.dirname(filename), { recursive: true });
      writeFileSync(filename, contents);
    }

    const filename = path.join(projectRoot, "src", "index.ts");
    const program = ts.createProgram(
      [filename, path.join(projectRoot, "src", "local.ts")],
      {
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        target: ts.ScriptTarget.ESNext,
      },
    );
    const linter = new Linter({ configType: "flat", cwd: projectRoot });
    const config = [
      {
        files: ["**/*.ts"],
        languageOptions: {
          parser,
          parserOptions: { programs: [program], tsconfigRootDir: projectRoot },
        },
        plugins: {
          codeperfect: {
            rules: { "barrel-files-exports-only": barrelFilesExportsOnlyRule },
          },
        },
        rules: { "codeperfect/barrel-files-exports-only": "error" },
      },
    ] as Parameters<typeof linter.verify>[1];

    return linter
      .verify(sourceText, config, filename)
      .map((message) => message.messageId ?? "");
  } finally {
    rmSync(projectRoot, { force: true, recursive: true });
  }
};

/**
 * Creates temporary file runners for the rule.
 * @param temporaryDirectories Directories created during the run.
 * @returns Helpers for running the rule in temp folders.
 * @example
 * ```typescript
 * const runner = createTemporaryRunner([]);
 * ```
 */
const createTemporaryRunner = (
  temporaryDirectories: string[],
): TemporaryRunner => {
  const runForTemporaryFile = (options: TemporaryFileOptions): RuleReport[] => {
    const directory = createRepoDirectory(options.root);
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, options.filename);

    return runRule(filePath, options.body, options.options);
  };

  const runDefaultIndex = (body: ESTree.Program["body"]): RuleReport[] =>
    runForTemporaryFile({ body, filename: "index.ts", root: "src" });

  const runTemporaryBarrel = (
    filename: string,
    body: ESTree.Program["body"],
    options: readonly unknown[] = [],
  ): RuleReport[] =>
    runForTemporaryFile({ body, filename, options, root: "tmp" });

  const runTemporaryIndex = (body: ESTree.Program["body"]): RuleReport[] =>
    runForTemporaryFile({ body, filename: "index.ts", root: "tmp" });

  const runTemporaryFeature = (body: ESTree.Program["body"]): RuleReport[] =>
    runForTemporaryFile({ body, filename: "feature.ts", root: "tmp" });

  return {
    runDefaultIndex,
    runTemporaryBarrel,
    runTemporaryFeature,
    runTemporaryIndex,
  };
};

export { createTemporaryRunner, runRule, runTypedBarrel };
