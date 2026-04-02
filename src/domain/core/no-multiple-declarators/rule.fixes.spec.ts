import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import {
  createContext,
  createVariableDeclaration,
  runRule,
} from "./rule-test-helpers";
import { applyFixes, getFixes, ruleFixesSuiteName } from "./rule.fixes";

/** Report shape used by the unusable-fix coverage test. */
interface ReportWithOptionalFix {
  /** Optional fix callback captured from a rule report. */
  fix: Rule.ReportFixer | undefined;
}

describe(ruleFixesSuiteName, () => {
  it("splits standalone declarations with a conservative autofix", () => {
    // Arrange
    const sourceText = [
      "if (ready) {",
      "  const availableRules = new Set(Object.keys(rules ?? {})), customError = buildCustomErrorRules(availableRules);",
      "}",
    ].join("\n");
    const statementText =
      "const availableRules = new Set(Object.keys(rules ?? {})), customError = buildCustomErrorRules(availableRules);";
    const declaration = createVariableDeclaration({
      declaratorTexts: [
        "availableRules = new Set(Object.keys(rules ?? {}))",
        "customError = buildCustomErrorRules(availableRules)",
      ],
      kind: "const",
      sourceText,
      statementText,
    });
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(applyFixes(sourceText, getFixes(reports))).toBe(
      [
        "if (ready) {",
        "  const availableRules = new Set(Object.keys(rules ?? {}));",
        "  const customError = buildCustomErrorRules(availableRules);",
        "}",
      ].join("\n"),
    );
  });

  it("fixes destructuring declarators when they are otherwise safe", () => {
    // Arrange
    const sourceText =
      "const { availableRules } = source, customError = buildError(availableRules);";
    const declaration = createVariableDeclaration({
      declaratorTexts: [
        "{ availableRules } = source",
        "customError = buildError(availableRules)",
      ],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(applyFixes(sourceText, getFixes(reports))).toBe(
      [
        "const { availableRules } = source;",
        "const customError = buildError(availableRules);",
      ].join("\n"),
    );
  });

  it("fixes let declarations without initializers", () => {
    // Arrange
    const sourceText = "let availableRules, customError = buildError();";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["availableRules", "customError = buildError()"],
      kind: "let",
      sourceText,
      statementText: sourceText,
    });
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(applyFixes(sourceText, getFixes(reports))).toBe(
      ["let availableRules;", "let customError = buildError();"].join("\n"),
    );
  });

  it("falls back to sourceCode.getText() when the text property is unavailable", () => {
    // Arrange
    const sourceText =
      "const availableRules = rules, customError = buildError();";
    const declaration = createVariableDeclaration({
      declaratorTexts: ["availableRules = rules", "customError = buildError()"],
      kind: "const",
      sourceText,
      statementText: sourceText,
    });
    const { context, reports } = createContext(sourceText, { omitText: true });

    // Act
    runRule(context, declaration);

    // Assert
    expect(applyFixes(sourceText, getFixes(reports))).toBe(
      [
        "const availableRules = rules;",
        "const customError = buildError();",
      ].join("\n"),
    );
  });

  it("collects iterable fixes from every fixer helper", () => {
    // Arrange
    const sourceText = "const first = 1;";
    const reports = [
      {
        fix: (fixer: Rule.RuleFixer): Rule.Fix[] => [
          fixer.insertTextAfter({} as Rule.Node, " after"),
          fixer.insertTextAfterRange([1, 1], " range-after"),
          fixer.insertTextBefore({} as Rule.Node, "before "),
          fixer.insertTextBeforeRange([2, 2], "range-before "),
          fixer.remove({} as Rule.Node),
          fixer.removeRange([3, 3]),
          fixer.replaceText({} as Rule.Node, "replace"),
          fixer.replaceTextRange([4, 4], "range-replace"),
        ],
      },
    ];

    // Act
    const fixes = getFixes(reports);

    // Assert
    expect(fixes).toHaveLength(8);
    expect(applyFixes(sourceText, fixes)).toContain("range-replace");
  });

  it("ignores reports without usable fix results", () => {
    // Arrange
    const reports = [
      { fix: void 0 },
      { fix: void 0 },
    ] as const satisfies readonly ReportWithOptionalFix[];

    // Act
    const fixes = getFixes(reports);

    // Assert
    expect(fixes).toStrictEqual([]);
  });
});
