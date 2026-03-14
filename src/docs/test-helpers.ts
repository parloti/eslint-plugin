import type { Rule } from "eslint";

/** Type definition for rule data. */
interface FixReportEntry {
  /** Fix helper value. */
  fix?: null | Rule.ReportFixer | undefined;
}

/** Type definition for rule data. */
type FixResult = Exclude<ReturnType<Rule.ReportFixer>, null>;

/**
 * Creates createFixer.
 * @returns Return value output.
 * @example
 * ```typescript
 * createFixer();
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
 * Checks isFixIterable.
 * @param fixResult Input fixResult value.
 * @returns Return value output.
 * @example
 * ```typescript
 * isFixIterable();
 * ```
 */
const isFixIterable = (fixResult: FixResult): fixResult is Iterable<Rule.Fix> =>
  Symbol.iterator in fixResult;

/**
 * Gets getFixText.
 * @param fixResult Input fixResult value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getFixText();
 * ```
 */
const getFixText = (fixResult?: FixResult): string | undefined => {
  if (fixResult === void 0) {
    return void 0;
  }
  if (isFixIterable(fixResult)) {
    return [...fixResult][0]?.text;
  }

  return fixResult.text;
};

/**
 * Gets getFixes.
 * @param reports Input reports value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getFixes();
 * ```
 */
const getFixes = (reports: FixReportEntry[]): Rule.Fix[] => {
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
 * Applies applyFixes.
 * @param sourceText Input sourceText value.
 * @param fixes Input fixes value.
 * @returns Return value output.
 * @example
 * ```typescript
 * applyFixes();
 * ```
 */
const applyFixes = (sourceText: string, fixes: Rule.Fix[]): string => {
  const sorted = fixes.toSorted(
    (left, right) => right.range[0] - left.range[0],
  );

  let output = sourceText;

  for (const fix of sorted) {
    output = [
      output.slice(0, fix.range[0]),
      fix.text,
      output.slice(fix.range[1]),
    ].join("");
  }

  return output;
};

export { applyFixes, createFixer, getFixes, getFixText };
