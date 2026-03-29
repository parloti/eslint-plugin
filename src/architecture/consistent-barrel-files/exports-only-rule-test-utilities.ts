import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { SourceCode } from "eslint";
import path from "node:path";
import { cwd } from "node:process";

import { barrelFilesExportsOnlyRule } from "./exports-only-rule";
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
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
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
  const context = createRuleContext({
    filename,
    options,
    reports,
    sourceCode,
  });
  const listeners = barrelFilesExportsOnlyRule.create(context);
  const programListener = listeners.Program;

  programListener?.(context.sourceCode.ast);

  return reports;
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

export { createTemporaryRunner, runRule };
