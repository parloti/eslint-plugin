import type { Rule } from "eslint";
import type * as ESTree from "estree";

/** Set of disallowed module-specifier file extensions. */
const disallowedExtensions = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);

/**
 * Gets the trailing extension from a module specifier string.
 * @param source Module specifier text.
 * @returns File extension including the leading dot when present.
 * @example
 * ```typescript
 * const extension = getTrailingExtension("./feature.ts");
 * ```
 */
const getSpecifierEndIndex = (source: string): number => {
  const queryIndex = source.indexOf("?");
  const hashIndex = source.indexOf("#");
  const endIndexCandidates = [queryIndex, hashIndex].filter(
    (index) => index >= 0,
  );

  return endIndexCandidates.length === 0
    ? source.length
    : Math.min(...endIndexCandidates);
};

/**
 * Gets the trailing extension from a module specifier string.
 * @param source Module specifier text.
 * @returns File extension including the leading dot when present.
 * @example
 * ```typescript
 * const extension = getTrailingExtension("./feature.ts");
 * ```
 */
const getTrailingExtension = (source: string): string | undefined => {
  const endIndex = getSpecifierEndIndex(source);
  const cleanedSource = source.slice(0, endIndex);
  const lastSlashIndex = Math.max(
    cleanedSource.lastIndexOf("/"),
    cleanedSource.lastIndexOf("\\"),
  );
  const basename = cleanedSource.slice(lastSlashIndex + 1);
  const dotIndex = basename.lastIndexOf(".");

  if (dotIndex <= 0) {
    return void 0;
  }

  return basename.slice(dotIndex).toLowerCase();
};

/**
 * Builds the fixed source literal text with the disallowed extension removed.
 * @param sourceLiteral Source literal node to fix.
 * @returns Fixed source text including surrounding quotes.
 * @example
 * ```typescript
 * const fixed = buildFixedSource(sourceLiteral);
 * ```
 */
const buildFixedSource = (
  sourceLiteral: ESTree.Literal,
): string | undefined => {
  const raw = sourceLiteral.raw;
  const value = sourceLiteral.value;

  if (typeof value !== "string" || raw === void 0) {
    return void 0;
  }

  const quoteChar = raw[0];
  const endIndex = getSpecifierEndIndex(value);
  const cleanedSource = value.slice(0, endIndex);
  const suffix = value.slice(endIndex);
  const lastSlashIndex = Math.max(
    cleanedSource.lastIndexOf("/"),
    cleanedSource.lastIndexOf("\\"),
  );
  const basename = cleanedSource.slice(lastSlashIndex + 1);
  const dotIndex = basename.lastIndexOf(".");

  if (dotIndex <= 0) {
    return void 0;
  }

  const withoutExtension = cleanedSource.slice(
    0,
    cleanedSource.length - basename.length + dotIndex,
  );

  return `${String(quoteChar)}${withoutExtension}${suffix}${String(quoteChar)}`;
};

/**
 * Checks whether a source literal should be reported.
 * @param sourceLiteral Source literal node.
 * @returns True when the source includes a disallowed file extension.
 * @example
 * ```typescript
 * const forbidden = hasDisallowedExtension(sourceLiteral);
 * ```
 */
const hasDisallowedExtension = (sourceLiteral: ESTree.Literal): boolean => {
  if (typeof sourceLiteral.value !== "string") {
    return false;
  }

  const extension = getTrailingExtension(sourceLiteral.value);

  return extension !== void 0 && disallowedExtensions.has(extension);
};

/**
 * Reports a statement when it references a source with disallowed extension.
 * @param context Rule execution context.
 * @param statement Statement that may include a source literal.
 * @example
 * ```typescript
 * reportWhenSourceHasExtension(context, statement);
 * ```
 */
const reportWhenSourceHasExtension = (
  context: Rule.RuleContext,
  statement:
    | ESTree.ExportAllDeclaration
    | ESTree.ExportNamedDeclaration
    | ESTree.ImportDeclaration,
): void => {
  const sourceLiteral = statement.source;

  if (sourceLiteral === null || sourceLiteral === void 0) {
    return;
  }

  if (!hasDisallowedExtension(sourceLiteral)) {
    return;
  }

  const fixedSource = buildFixedSource(sourceLiteral);

  const fix =
    fixedSource === void 0
      ? void 0
      : (fixer: Rule.RuleFixer): Rule.Fix =>
          fixer.replaceText(sourceLiteral, fixedSource);

  context.report({
    ...(fix !== void 0 && { fix }),
    messageId: "unexpectedExtension",
    node: sourceLiteral,
    ...(fix !== void 0 && { suggest: [{ fix, messageId: "removeExtension" }] }),
  });
};

/**
 * Narrows one program statement to the source-bearing declarations this rule inspects.
 * @param statement Program statement node.
 * @returns Source-bearing declaration when supported.
 * @example
 * ```typescript
 * const declaration = asSourceDeclaration(statement);
 * ```
 */
const asSourceDeclaration = (
  statement: ESTree.Program["body"][number],
):
  | ESTree.ExportAllDeclaration
  | ESTree.ExportNamedDeclaration
  | ESTree.ImportDeclaration
  | undefined => {
  if (statement.type === "ExportAllDeclaration") {
    return statement;
  }

  if (statement.type === "ExportNamedDeclaration") {
    return statement;
  }

  if (statement.type === "ImportDeclaration") {
    return statement;
  }

  return void 0;
};

/** ESLint rule that forbids import/export module specifiers with explicit file extensions. */
const noImportExportExtensionsRule: Rule.RuleModule = {
  create: (context: Rule.RuleContext): Rule.RuleListener => ({
    Program(node: ESTree.Program): void {
      for (const statement of node.body) {
        const declaration = asSourceDeclaration(statement);

        if (declaration !== void 0) {
          reportWhenSourceHasExtension(context, declaration);
        }
      }
    },
  }),
  meta: {
    docs: {
      description:
        "Forbid explicit file extensions in import/export module specifiers.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/no-import-export-extensions.md",
    },
    fixable: "code",
    hasSuggestions: true,
    messages: {
      removeExtension: "Remove the file extension from this module specifier.",
      unexpectedExtension:
        "Avoid file extensions in import/export module specifiers.",
    },
    schema: [],
    type: "problem",
  },
};

export { noImportExportExtensionsRule };
