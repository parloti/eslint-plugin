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

import { hasFixData, hasRange } from "./types";

/** Matches comment syntax between declarators. */
const commentPattern = /\/\/|\/\*/u;
/** Declaration kinds that can be safely split into standalone statements. */
const fixableDeclarationKinds = new Set(["const", "let", "var"]);
/** Loop parent types whose initializers cannot be safely split. */
const loopParentTypes = new Set([
  "ForAwaitOfStatement",
  "ForInStatement",
  "ForOfStatement",
]);

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
 * Gets the line separator style used by the current source file.
 * @param sourceText Full source text.
 * @returns File-native line separator sequence.
 * @example
 * ```typescript
 * const lineSeparator = getLineSeparator("const a = 1;\r\nconst b = 2;");
 * ```
 */
const getLineSeparator = (sourceText: string): string =>
  sourceText.includes("\r\n") ? "\r\n" : "\n";

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
 * Determines whether a declaration is ambient in TypeScript source.
 * @param node Declaration node to inspect.
 * @returns Whether the declaration is marked with `declare`.
 * @example
 * ```typescript
 * const ambient = isTypeScriptAmbientDeclaration(node);
 * ```
 */
const isTypeScriptAmbientDeclaration = (
  node: VariableDeclarationNode,
): boolean => node.declare === true;

/**
 * Determines whether a declaration kind is safe to rewrite.
 * @param node Declaration node to inspect.
 * @returns Whether the declaration kind supports conservative split fixes.
 * @example
 * ```typescript
 * const safeKind = hasFixableDeclarationKind(node);
 * ```
 */
const hasFixableDeclarationKind = (node: VariableDeclarationNode): boolean =>
  hasFixData(node) && fixableDeclarationKinds.has(node.kind);

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
  let indentLength = 0;

  while (indentLength < linePrefix.length) {
    const currentCharacter = linePrefix[indentLength];

    if (currentCharacter !== "\t" && currentCharacter !== " ") {
      break;
    }

    indentLength += 1;
  }

  return linePrefix.slice(0, indentLength);
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

  if (
    !hasFixableDeclarationKind(node) ||
    isTypeScriptAmbientDeclaration(node)
  ) {
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
  const lineSeparator = getLineSeparator(sourceText);

  return declarations
    .map((declaration) => `${node.kind} ${sourceCode.getText(declaration)};`)
    .join(`${lineSeparator}${indent}`);
};

export {
  buildReplacement,
  canFix,
  getRangedDeclarations,
  getSourceCode,
  getSourceText,
};
