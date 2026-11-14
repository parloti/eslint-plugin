import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { createPackageSubpathImportMatcher } from "./package-subpath-import-utilities";

/**
 * Builds fixed source literal text for a package import alias.
 * @param sourceLiteral Source literal node to fix.
 * @param aliasSpecifier Replacement package import specifier.
 * @returns Fixed source text including surrounding quotes.
 * @example
 * ```typescript
 * const fixed = buildFixedSource(sourceLiteral, "#src/feature");
 * ```
 */
const buildFixedSource = (
  sourceLiteral: ESTree.Literal,
  aliasSpecifier: string,
): string | undefined => {
  const raw = sourceLiteral.raw;
  const quoteChar = raw?.[0];

  if (quoteChar !== "'" && quoteChar !== '"') {
    return void 0;
  }

  const escapePrefix = String.fromCodePoint(0x5c);
  const escapedAliasSpecifier = Array.from(aliasSpecifier, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    if (character === escapePrefix) {
      return `${escapePrefix}${escapePrefix}`;
    }

    if (character === quoteChar) {
      return `${escapePrefix}${character}`;
    }

    if (character === "'" || character === '"') {
      return `${escapePrefix}u${codePoint.toString(16).padStart(4, "0")}`;
    }

    if (codePoint <= 0x1f) {
      return `${escapePrefix}x${codePoint.toString(16).padStart(2, "0")}`;
    }

    return codePoint === 0x20_28 || codePoint === 0x20_29
      ? `${escapePrefix}u${codePoint.toString(16).padStart(4, "0")}`
      : character;
  }).join("");

  return `${quoteChar}${escapedAliasSpecifier}${quoteChar}`;
};

/**
 * Reports one module source when a package import alias is available.
 * @param context Rule execution context.
 * @param matchPackageImportAlias Lazy package import matcher.
 * @param sourceLiteral Module source literal candidate.
 * @example
 * ```typescript
 * reportPackageSubpathImport(context, matchPackageImportAlias, sourceLiteral);
 * ```
 */
const reportPackageSubpathImport = (
  context: Rule.RuleContext,
  matchPackageImportAlias: (sourceSpecifier: string) => string | undefined,
  sourceLiteral: ESTree.Literal | null | undefined,
): void => {
  if (
    sourceLiteral === null ||
    sourceLiteral === void 0 ||
    typeof sourceLiteral.value !== "string"
  ) {
    return;
  }

  const aliasSpecifier = matchPackageImportAlias(sourceLiteral.value);

  if (aliasSpecifier === void 0) {
    return;
  }

  const fixedSource = buildFixedSource(sourceLiteral, aliasSpecifier);
  const fix =
    fixedSource === void 0
      ? void 0
      : (fixer: Rule.RuleFixer): Rule.Fix =>
          fixer.replaceText(sourceLiteral, fixedSource);

  context.report({
    ...(fix !== void 0 && { fix }),
    data: { aliasSpecifier },
    messageId: "usePackageImportAlias",
    node: sourceLiteral,
  });
};

/** ESLint rule that prefers package.json subpath imports over matching relative paths. */
const preferPackageSubpathImportsRule: Rule.RuleModule = {
  create: (context: Rule.RuleContext): Rule.RuleListener => {
    const matchPackageImportAlias = createPackageSubpathImportMatcher(
      context.filename,
      context.cwd,
    );

    return {
      ExportAllDeclaration(node: ESTree.ExportAllDeclaration): void {
        reportPackageSubpathImport(
          context,
          matchPackageImportAlias,
          node.source,
        );
      },
      ExportNamedDeclaration(node: ESTree.ExportNamedDeclaration): void {
        reportPackageSubpathImport(
          context,
          matchPackageImportAlias,
          node.source,
        );
      },
      ImportDeclaration(node: ESTree.ImportDeclaration): void {
        reportPackageSubpathImport(
          context,
          matchPackageImportAlias,
          node.source,
        );
      },
      ImportExpression(node: ESTree.ImportExpression): void {
        if (node.source.type === "Literal") {
          reportPackageSubpathImport(
            context,
            matchPackageImportAlias,
            node.source,
          );
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Prefer package.json subpath imports over matching relative module specifiers.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/prefer-package-subpath-imports.md",
    },
    fixable: "code",
    messages: {
      usePackageImportAlias:
        "Use the package.json import alias '{{aliasSpecifier}}' instead of this relative module specifier.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { preferPackageSubpathImportsRule };
