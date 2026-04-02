import type { Rule } from "eslint";

/** Report shape used by fix collection helpers. */
interface FixReportEntry {
  /** Fix helper value captured from a rule report. */
  fix?: null | Rule.ReportFixer | undefined;
}

/** Result returned by a rule fixer callback. */
type FixResult = Exclude<ReturnType<Rule.ReportFixer>, null>;

/** Suite name used by the fix-focused no-multiple-declarators tests. */
const ruleFixesSuiteName = "no-multiple-declarators rule fixes";

/**
 * Creates a minimal fixer object for unit tests.
 * @returns A fixer compatible with ESLint rule fix callbacks.
 * @example Create a fixer for a captured report callback.
 * ```typescript
 * const fixer = createFixer();
 * ```
 */
const createFixer = (): Parameters<Rule.ReportFixer>[0] => ({
  insertTextAfter: (syntaxElement, text): Rule.Fix => {
    void syntaxElement;
    return { range: [0, 0], text };
  },
  insertTextAfterRange: (range, text): Rule.Fix => ({ range, text }),
  insertTextBefore: (syntaxElement, text): Rule.Fix => {
    void syntaxElement;
    return { range: [0, 0], text };
  },
  insertTextBeforeRange: (range, text): Rule.Fix => ({ range, text }),
  remove: (syntaxElement): Rule.Fix => {
    void syntaxElement;
    return { range: [0, 0], text: "" };
  },
  removeRange: (range): Rule.Fix => ({ range, text: "" }),
  replaceText: (syntaxElement, text): Rule.Fix => {
    void syntaxElement;
    return { range: [0, 0], text };
  },
  replaceTextRange: (range, text): Rule.Fix => ({ range, text }),
});

/**
 * Determines whether a fix result is iterable.
 * @param fixResult Fix result returned by an ESLint rule fixer.
 * @returns Whether the fix result can be iterated.
 * @example Check an iterable fix result.
 * ```typescript
 * const iterable = isFixIterable([{ range: [0, 0], text: "value" }]);
 * ```
 */
const isFixIterable = (fixResult: FixResult): fixResult is Iterable<Rule.Fix> =>
  Symbol.iterator in fixResult;

/**
 * Collects concrete fixes from captured report entries.
 * @param reports Captured rule reports to evaluate.
 * @returns All concrete fixes produced by the report callbacks.
 * @example Collect fixes from a captured report array.
 * ```typescript
 * const fixes = getFixes([
 *   { fix: () => ({ range: [0, 0], text: "const value = 1;" }) },
 * ]);
 * ```
 */
const getFixes = (reports: readonly FixReportEntry[]): Rule.Fix[] => {
  const fixer = createFixer();
  const fixes: Rule.Fix[] = [];

  for (const report of reports) {
    const fixResult = report.fix?.(fixer) ?? void 0;

    if (fixResult !== void 0) {
      if (isFixIterable(fixResult)) {
        fixes.push(...fixResult);
      } else {
        fixes.push(fixResult);
      }
    }
  }

  return fixes;
};

/**
 * Applies fixes to source text from the end of the file toward the start.
 * @param sourceText Original source text.
 * @param fixes Concrete fixes that should be applied.
 * @returns Source text with the fixes applied.
 * @example Apply a replacement fix to source text.
 * ```typescript
 * const output = applyFixes("const first = 1, second = 2;", [
 *   { range: [0, 26], text: "const first = 1;\nconst second = 2;" },
 * ]);
 * ```
 */
const applyFixes = (sourceText: string, fixes: readonly Rule.Fix[]): string => {
  const sortedFixes = fixes.toSorted(
    (left, right) => right.range[0] - left.range[0],
  );

  let output = sourceText;

  for (const fix of sortedFixes) {
    output = [
      output.slice(0, fix.range[0]),
      fix.text,
      output.slice(fix.range[1]),
    ].join("");
  }

  return output;
};

export { applyFixes, getFixes, ruleFixesSuiteName };
