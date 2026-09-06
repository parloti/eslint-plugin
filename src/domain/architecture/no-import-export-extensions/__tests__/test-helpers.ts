import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { SourceCode } from "eslint";

import {
  createBody,
  createImportDeclaration,
  createLiteral,
  createProgram,
} from "../../consistent-barrel-files/__tests__/test-helpers";
import { noImportExportExtensionsRule } from "../no-import-export-extensions-rule";

/** Message-id view over ESLint report descriptors used in tests. */
interface ReportDescriptorWithMessageId {
  /** Optional message id passed to context.report. */
  messageId?: string;
}

/** Suggestion view over ESLint report descriptors used in tests. */
interface ReportDescriptorWithSuggest {
  /** Optional suggest array passed to context.report. */
  suggest?: Rule.SuggestionReportDescriptor[];
}

/** Type definition for captured rule reports. */
interface RuleReport {
  /** Fix callback returned by the rule when available. */
  fix: ((fixer: Rule.RuleFixer) => Rule.Fix) | undefined;

  /** Message id emitted by the rule. */
  messageId: string | undefined;

  /** Suggestion descriptors emitted by the rule. */
  suggest: RuleSuggestion[] | undefined;
}

/** Suggestion descriptor captured from a report for assertions. */
interface RuleSuggestion {
  /** Fix callback for the suggestion. */
  fix?: Rule.SuggestionReportDescriptor["fix"];

  /** Message id emitted for the suggestion. */
  messageId?: string;
}

/** Stub fixer that captures replaceText calls. */
interface StubFix {
  /** Replacement text passed to replaceText. */
  text: string;
}

/** Stub fixer and the replacements captured during a run. */
interface StubFixerCapture {
  /** Stub fixer passed to fix callbacks. */
  fixer: Rule.RuleFixer;

  /** Replacement texts captured by the stub fixer. */
  fixes: StubFix[];
}

/**
 * Creates a source-code object for the supplied body.
 * @param body Program body statements.
 * @returns SourceCode instance backed by an ESTree program.
 * @example
 * ```typescript
 * createSourceCode(createBody());
 * ```
 */
const createSourceCode = (body: ESTree.Program["body"]): SourceCode =>
  new SourceCode("", createProgram(body));

/**
 * Runs the extension rule against an in-memory program body.
 * @param body Program body statements.
 * @returns Captured reports.
 * @example
 * ```typescript
 * runRule(createBody());
 * ```
 */
const runRule = (body: ESTree.Program["body"]): RuleReport[] => {
  const reports: RuleReport[] = [];
  const sourceCode = createSourceCode(body);

  const context = {
    cwd: "/repo",
    filename: "/repo/src/feature.ts",
    id: "no-import-export-extensions",
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    options: [],
    parserOptions: {},
    parserPath: void 0,
    physicalFilename: "/repo/src/feature.ts",
    report: (report: Rule.ReportDescriptor): void => {
      const { messageId } = report as ReportDescriptorWithMessageId;
      const { suggest } = report as ReportDescriptorWithSuggest;
      const fix = "fix" in report ? (report.fix as RuleReport["fix"]) : void 0;
      reports.push({ fix, messageId, suggest });
    },
    settings: {},
    sourceCode,
  } as unknown as Rule.RuleContext;

  const listeners = noImportExportExtensionsRule.create(context);
  const programListener = listeners.Program;

  programListener?.(context.sourceCode.ast);

  return reports;
};

/**
 * Runs the rule against an import declaration with the supplied source.
 * @param source Module source literal or extension string to test.
 * @returns Captured reports.
 * @example
 * ```typescript
 * runImportRule("./feature.ts");
 * ```
 */
const runImportRule = (source: ESTree.Literal | string): RuleReport[] =>
  runRule(
    createBody({
      ...createImportDeclaration(),
      source: typeof source === "string" ? createLiteral(source) : source,
    }),
  );

/**
 * Runs the rule against an export-all declaration with the supplied source.
 * @param source Module source extension string to test.
 * @returns Captured reports.
 * @example
 * ```typescript
 * runExportAllRule("./feature.ts");
 * ```
 */
const runExportAllRule = (source: string): RuleReport[] =>
  runRule(
    createBody({
      attributes: [],
      exported: { name: "feature", type: "Identifier" },
      source: createLiteral(source),
      type: "ExportAllDeclaration",
    }),
  );

/**
 * Runs the rule against a named export-from declaration with the supplied source.
 * @param source Module source extension string to test.
 * @returns Captured reports.
 * @example
 * ```typescript
 * runNamedExportRule("./feature.ts");
 * ```
 */
const runNamedExportRule = (source: string): RuleReport[] =>
  runRule(
    createBody({
      attributes: [],
      source: createLiteral(source),
      specifiers: [],
      type: "ExportNamedDeclaration",
    }),
  );

/**
 * Creates a stub fixer that records replaceText calls.
 * @returns Stub fixer and captured fixes.
 * @example
 * ```typescript
 * const { fixer, fixes } = createStubFixer();
 * ```
 */
const createStubFixer = (): StubFixerCapture => {
  const fixes: StubFix[] = [];
  const fixer = {
    replaceText: (_node: unknown, text: string): Rule.Fix => {
      fixes.push({ text });
      return { range: [0, 0], text } as unknown as Rule.Fix;
    },
  } as unknown as Rule.RuleFixer;
  return { fixer, fixes };
};

/**
 * Applies the primary fix of a report and returns captured replacements.
 * @param reports Reports captured from a rule run.
 * @returns Replacement texts applied by the fix.
 * @example
 * ```typescript
 * captureFix(runImportRule("./feature.ts"));
 * ```
 */
const captureFix = (reports: RuleReport[]): StubFix[] => {
  const { fixer, fixes } = createStubFixer();
  reports[0]?.fix?.(fixer);
  return fixes;
};

/**
 * Applies the suggestion fix of a report and returns captured replacements.
 * @param reports Reports captured from a rule run.
 * @returns Replacement texts applied by the suggestion fix.
 * @example
 * ```typescript
 * captureSuggestionFix(runImportRule("./feature.ts"));
 * ```
 */
const captureSuggestionFix = (reports: RuleReport[]): StubFix[] => {
  const { fixer, fixes } = createStubFixer();
  reports[0]?.suggest?.[0]?.fix?.(fixer);
  return fixes;
};

export {
  captureFix,
  captureSuggestionFix,
  runExportAllRule,
  runImportRule,
  runNamedExportRule,
  runRule,
};
