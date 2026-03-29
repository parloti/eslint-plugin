import type { Rule } from "eslint";

import type {
  FixableVariableDeclarationNode,
  ForInOrOfStatementNode,
  ForStatementNode,
  RangedVariableDeclaratorNode,
  SourceCodeAccess,
  VariableDeclarationNode,
  VariableDeclaratorNode,
} from "./types";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import { hasFixData, hasRange } from "./types";

/** Matches comment syntax between declarators. */
const commentPattern = /\/\/|\/\*/u;

/** Loop parent types whose initializers cannot be safely split. */
const loopParentTypes = new Set(["ForInStatement", "ForOfStatement"]);

/**
 * Gets the source access wrapper from the ESLint context.
 * @param context Rule execution context.
 * @returns Source access helpers used by the fixer.
 * @example
 * ```typescript
 * const sourceCode = getSourceCode(context);
 * ```
 */
const getSourceCode = (context: Rule.RuleContext): SourceCodeAccess =>
  context.sourceCode as unknown as SourceCodeAccess;

/**
 * Reads the full source text for the active file.
 * @param sourceCode Source access wrapper.
 * @returns Full source text.
 * @example
 * ```typescript
 * const sourceText = getSourceText(sourceCode);
 * ```
 */
const getSourceText = (sourceCode: SourceCodeAccess): string =>
  typeof sourceCode.text === "string" ? sourceCode.text : sourceCode.getText();

/**
 * Determines whether a declaration is used as a loop initializer.
 * @param node Declaration node to inspect.
 * @returns Whether the declaration is attached to a loop initializer.
 * @example
 * ```typescript
 * const inLoop = isLoopInitializer(node);
 * ```
 */
const isLoopInitializer = (node: VariableDeclarationNode): boolean => {
  const { parent } = node;

  if (parent?.type === "ForStatement") {
    return (parent as ForStatementNode).init === node;
  }

  if (parent !== void 0 && loopParentTypes.has(parent.type)) {
    return (parent as ForInOrOfStatementNode).left === node;
  }

  return false;
};

/**
 * Determines whether a declaration is wrapped in an export statement.
 * @param node Declaration node to inspect.
 * @returns Whether the declaration is directly exported.
 * @example
 * ```typescript
 * const exported = isWrappedExport(node);
 * ```
 */
const isWrappedExport = (node: VariableDeclarationNode): boolean =>
  node.parent?.type === "ExportDefaultDeclaration" ||
  node.parent?.type === "ExportNamedDeclaration";

/**
 * Gets the indentation for the line containing a declaration.
 * @param sourceText Full source text.
 * @param start Start offset of the declaration.
 * @returns Leading indentation for the declaration line.
 * @example
 * ```typescript
 * const indent = getLineIndent("const a = 1;", 0);
 * ```
 */
const getLineIndent = (sourceText: string, start: number): string => {
  const lineStart = sourceText.lastIndexOf("\n", start - 1) + 1;
  const linePrefix = sourceText.slice(lineStart, start);

  return linePrefix.replace(/[^\t ].*$/u, "");
};

/**
 * Detects whether comments appear between declarators.
 * @param declarations Declarators from a single declaration statement.
 * @param sourceText Full source text.
 * @returns Whether comments appear between declarators.
 * @example
 * ```typescript
 * const blocked = hasSeparatorComment(declarations, sourceText);
 * ```
 */
const hasSeparatorComment = (
  declarations: readonly VariableDeclaratorNode[],
  sourceText: string,
): boolean => {
  for (const [index, declaration] of declarations.entries()) {
    const nextDeclaration = declarations[index + 1];

    if (nextDeclaration === void 0) {
      break;
    }

    if (!hasRange(declaration) || !hasRange(nextDeclaration)) {
      return true;
    }

    const separatorText = sourceText.slice(
      declaration.range[1],
      nextDeclaration.range[0],
    );

    if (commentPattern.test(separatorText)) {
      return true;
    }
  }

  return false;
};

/**
 * Determines whether a declaration can be safely rewritten.
 * @param node Declaration node to inspect.
 * @param declarations Declarators within the declaration.
 * @param sourceText Full source text.
 * @returns Whether the declaration is safe to autofix.
 * @example
 * ```typescript
 * const fixable = canFix(node, declarations, sourceText);
 * ```
 */
const canFix = (
  node: VariableDeclarationNode,
  declarations: readonly VariableDeclaratorNode[],
  sourceText: string,
): boolean => {
  if (!hasFixData(node)) {
    return false;
  }

  if (isLoopInitializer(node) || isWrappedExport(node)) {
    return false;
  }

  return !hasSeparatorComment(declarations, sourceText);
};

/**
 * Converts declarators into separate declaration statements.
 * @param node Fixable declaration node.
 * @param declarations Declarators that should be split.
 * @param sourceCode Source access wrapper.
 * @returns Replacement text for the full declaration.
 * @example
 * ```typescript
 * const replacement = buildReplacement(node, declarations, sourceCode);
 * ```
 */
const buildReplacement = (
  node: FixableVariableDeclarationNode,
  declarations: readonly RangedVariableDeclaratorNode[],
  sourceCode: SourceCodeAccess,
): string => {
  const sourceText = getSourceText(sourceCode);
  const indent = getLineIndent(sourceText, node.range[0]);

  return declarations
    .map((declaration) => `${node.kind} ${sourceCode.getText(declaration)};`)
    .join(`\n${indent}`);
};

/**
 * Collects ranged declarators when every declarator exposes a range.
 * @param declarations Declarators from the declaration node.
 * @returns Declarators with confirmed ranges, or `undefined` when any range is missing.
 * @example
 * ```typescript
 * const ranged = getRangedDeclarations(node.declarations ?? []);
 * ```
 */
const getRangedDeclarations = (
  declarations: readonly VariableDeclaratorNode[],
): readonly RangedVariableDeclaratorNode[] | undefined => {
  const rangedDeclarations: RangedVariableDeclaratorNode[] = [];

  for (const declaration of declarations) {
    if (!hasRange(declaration)) {
      return void 0;
    }

    rangedDeclarations.push(declaration);
  }

  return rangedDeclarations;
};

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
    ...(fix === void 0 ? {} : { fix }),
    messageId: "singleDeclarator",
    node: node as unknown as Rule.Node,
  });
};

/** ESLint rule implementation for single-declarator variable statements. */
const noMultipleDeclaratorsRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      VariableDeclaration: (node: Rule.Node): void => {
        reportVariableDeclaration(context, node as VariableDeclarationNode);
      },
    };
  },
  meta: {
    docs: createRuleDocumentation(
      "no-multiple-declarators",
      "Require variable declarations to contain exactly one declarator per statement.",
    ),
    fixable: "code",
    messages: {
      singleDeclarator:
        "Declare exactly one variable per declaration statement.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { noMultipleDeclaratorsRule };
