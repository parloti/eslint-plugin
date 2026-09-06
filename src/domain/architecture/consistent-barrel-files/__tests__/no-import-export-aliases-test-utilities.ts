import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { SourceCode } from "eslint";

import { noImportExportAliasesRule } from "../no-import-export-aliases-rule";
import { createProgram } from "./test-helpers";

/** Message-id view over ESLint report descriptors used in tests. */
interface ReportDescriptorWithMessageId {
  /** Optional message id passed to context.report. */
  messageId?: string;
}

/** Type definition for captured rule reports. */
interface RuleReport {
  /** Message id emitted by the rule. */
  messageId: string | undefined;
}

/**
 * Creates a source-code object for the supplied body.
 * @param body Program body statements.
 * @returns SourceCode instance backed by an ESTree program.
 * @example
 * ```typescript
 * const sourceCode = createSourceCode(createBody());
 * ```
 */
const createSourceCode = (body: ESTree.Program["body"]): SourceCode =>
  new SourceCode("", createProgram(body));

/**
 * Runs the alias rule against an in-memory program body.
 * @param body Program body statements.
 * @returns Captured reports.
 * @example
 * ```typescript
 * const reports = runRule(createBody());
 * ```
 */
const runRule = (body: ESTree.Program["body"]): RuleReport[] => {
  const reports: RuleReport[] = [];
  const sourceCode = createSourceCode(body);

  const context = {
    cwd: "/repo",
    filename: "/repo/src/feature.ts",
    id: "no-import-export-aliases",
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    options: [],
    parserOptions: {},
    parserPath: void 0,
    physicalFilename: "/repo/src/feature.ts",
    report: (report: Rule.ReportDescriptor): void => {
      const { messageId } = report as ReportDescriptorWithMessageId;
      reports.push({ messageId });
    },
    settings: {},
    sourceCode,
  } as unknown as Rule.RuleContext;

  const listeners = noImportExportAliasesRule.create(context);
  const programListener = listeners.Program;

  programListener?.(context.sourceCode.ast);

  return reports;
};

/** Companion marker for test isolation. */
export { runRule };
