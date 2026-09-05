import type { Rule } from "eslint";

import type {
  SourceCodeAccess,
  VariableDeclarationNode,
  VariableDeclaratorNode,
} from "./types";

import {
  buildReplacement,
  canFix,
  getRangedDeclarations,
  getSourceCode,
  getSourceText,
} from "./rule-utilities";
import { hasFixData } from "./types";

/**
 * Creates an autofix callback when the declaration can be rewritten safely.
 * @param node Declaration node to inspect.
 * @param declarations Declarators from the declaration statement.
 * @param sourceCode Source access wrapper.
 * @returns Fix callback when the declaration is safe to split.
 * @example
 * ```typescript
 * const fix = createDeclarationFix(node, declarations, sourceCode);
 * ```
 */
const createDeclarationFix = (
  node: VariableDeclarationNode,
  declarations: readonly VariableDeclaratorNode[],
  sourceCode: SourceCodeAccess,
): ((fixer: Rule.RuleFixer) => Rule.Fix) | undefined => {
  const sourceText = getSourceText(sourceCode);

  if (!canFix(node, declarations, sourceText) || !hasFixData(node)) {
    return void 0;
  }

  const rangedDeclarations = getRangedDeclarations(declarations);
  if (rangedDeclarations === void 0) {
    return void 0;
  }

  return (fixer: Rule.RuleFixer): Rule.Fix =>
    fixer.replaceTextRange(
      node.range,
      buildReplacement(node, rangedDeclarations, sourceCode),
    );
};

/**
 * Reports declarations that contain more than one declarator.
 * @param context Rule execution context.
 * @param node Declaration node to report.
 * @example
 * ```typescript
 * reportVariableDeclaration(context, node);
 * ```
 */
const reportVariableDeclaration = (
  context: Rule.RuleContext,
  node: VariableDeclarationNode,
): void => {
  const declarations = node.declarations ?? [];

  if (declarations.length <= 1) {
    return;
  }

  const sourceCode = getSourceCode(context);
  const fix = createDeclarationFix(node, declarations, sourceCode);

  context.report({
    ...(fix !== void 0 && { fix }),
    messageId: "singleDeclarator",
    node: node as unknown as Rule.Node,
    ...(fix !== void 0 && {
      suggest: [{ fix, messageId: "splitDeclaration" }],
    }),
  });
};

/** ESLint rule implementation for single-declarator variable statements. */
const noMultipleDeclaratorsRule: Rule.RuleModule = {
  create: (context: Rule.RuleContext): Rule.RuleListener => ({
    VariableDeclaration: (node: Rule.Node): void => {
      reportVariableDeclaration(context, node as VariableDeclarationNode);
    },
  }),
  meta: {
    docs: {
      description:
        "Require variable declarations to contain exactly one declarator per statement.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/no-multiple-declarators.md",
    },
    fixable: "code",
    hasSuggestions: true,
    messages: {
      singleDeclarator:
        "Declare exactly one variable per declaration statement.",
      splitDeclaration:
        "Split this declaration into separate single-variable statements.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { noMultipleDeclaratorsRule };
