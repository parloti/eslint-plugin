import type { Rule } from "eslint";

import type { TestBlockAnalysis } from "../aaa";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import {
  analyzeTestBlock,
  getLineStartRange,
  getPhaseBoundaryComments,
  hasBlankLineBeforeComment,
} from "../aaa";
import { buildMissingSectionFixes } from "./missing-section-fixes";

/** Enforces explicit AAA section comments and spacing within supported test blocks. */
const requireAaaSectionsRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const analysis = analyzeTestBlock(context, node);
        if (analysis === void 0) {
          return;
        }

        reportMissingSections(context, analysis);
        reportCodeBeforeArrange(context, analysis);
        reportBlankLineSeparators(context, analysis);
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: createRuleDocumentation(
      "require-aaa-sections",
      "Require strict // Arrange, // Act, and // Assert markers in supported test blocks.",
    ),
    fixable: "code",
    messages: {
      blankLineBeforeSection:
        "Insert a blank line before the // {{section}} section comment.",
      codeBeforeArrange:
        "Move setup statements below the first // Arrange section comment.",
      missingSections: "Add the missing AAA section comments: {{sections}}.",
    },
    schema: [],
    type: "layout",
  },
};

/**
 * Reports section comments that are missing a blank line above them.
 * @param context ESLint rule context.
 * @param analysis Parsed test-block analysis.
 * @example
 * ```typescript
 * reportBlankLineSeparators({ report() {} } as never, { sectionComments: [], sourceText: "" } as never);
 * ```
 */
function reportBlankLineSeparators(
  context: Rule.RuleContext,
  analysis: TestBlockAnalysis,
): void {
  for (const sectionComment of getPhaseBoundaryComments(analysis)) {
    if (
      !hasBlankLineBeforeComment(analysis.sourceText, sectionComment.comment)
    ) {
      context.report({
        data: { section: sectionComment.phases.join(" & ") },
        fix: (fixer) =>
          fixer.insertTextBeforeRange(
            getLineStartRange(
              analysis.sourceText,
              sectionComment.comment.loc.start.line,
            ),
            analysis.newline,
          ),
        messageId: "blankLineBeforeSection",
        node: sectionComment.comment,
      });
    }
  }
}

/**
 * Reports executable statements that appear before the first Arrange section.
 * @param context ESLint rule context.
 * @param analysis Parsed test-block analysis.
 * @example
 * ```typescript
 * reportCodeBeforeArrange({ report() {} } as never, { sectionComments: [], statements: [] } as never);
 * ```
 */
function reportCodeBeforeArrange(
  context: Rule.RuleContext,
  analysis: TestBlockAnalysis,
): void {
  const firstArrangeLine = analysis.sectionComments.find((sectionComment) =>
    sectionComment.phases.includes("Arrange"),
  )?.comment.loc.start.line;
  if (firstArrangeLine === void 0) {
    return;
  }

  const statementBeforeArrange = analysis.statements.find(
    (statement) => statement.node.loc.start.line < firstArrangeLine,
  );
  if (statementBeforeArrange === void 0) {
    return;
  }

  context.report({
    messageId: "codeBeforeArrange",
    node: statementBeforeArrange.node,
  });
}

/**
 * Reports any AAA section markers that are missing from a supported test block.
 * @param context ESLint rule context.
 * @param analysis Parsed test-block analysis.
 * @example
 * ```typescript
 * reportMissingSections({ report() {} } as never, { sectionComments: [] } as never);
 * ```
 */
function reportMissingSections(
  context: Rule.RuleContext,
  analysis: TestBlockAnalysis,
): void {
  const presentSections = new Set(
    analysis.sectionComments.flatMap((sectionComment) => sectionComment.phases),
  );
  const missingSections = (["Arrange", "Act", "Assert"] as const).filter(
    (phase) => !presentSections.has(phase),
  );

  if (missingSections.length === 0) {
    return;
  }

  context.report({
    data: { sections: missingSections.join(", ") },
    fix:
      analysis.bodyLineCount >= 3
        ? (fixer: Rule.RuleFixer): Rule.Fix[] =>
            buildMissingSectionFixes(analysis, missingSections, fixer)
        : void 0,
    messageId: "missingSections",
    node: analysis.callExpression,
  });
}

export { requireAaaSectionsRule };
