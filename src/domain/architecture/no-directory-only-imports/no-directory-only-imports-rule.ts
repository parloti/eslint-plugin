import type { Rule } from "eslint";
import type * as ESTree from "estree";

/** Describes the source literal on a TypeScript import type node. */
interface TypeScriptImportTypeNode {
  /** Module specifier used by the type import. */
  source: ESTree.Literal;
}

/**
 * Checks whether a module specifier contains only relative directory segments.
 * @param sourceSpecifier Module specifier text.
 * @returns True when the path is made only from `.` and `..` segments.
 * @example
 * ```typescript
 * const directoryOnly = isDirectoryOnlySpecifier("./..");
 * ```
 */
const isDirectoryOnlySpecifier = (sourceSpecifier: string): boolean => {
  const suffixIndex = sourceSpecifier.search(/[?#]/);
  const pathSpecifier =
    suffixIndex < 0 ? sourceSpecifier : sourceSpecifier.slice(0, suffixIndex);

  if (!pathSpecifier.startsWith(".")) {
    return false;
  }

  const normalizedPathSpecifier = pathSpecifier.includes("\\")
    ? pathSpecifier.replaceAll("\\", "/")
    : pathSpecifier;
  const pathSegments = normalizedPathSpecifier.split("/");

  return pathSegments.every((segment) => ["", ".", ".."].includes(segment));
};

/**
 * Reports one module source when it refers only to directory levels.
 * @param context Rule execution context.
 * @param sourceNode Module source node.
 * @example
 * ```typescript
 * reportDirectoryOnlySpecifier(context, sourceNode);
 * ```
 */
const reportDirectoryOnlySpecifier = (
  context: Rule.RuleContext,
  sourceNode: ESTree.Literal | ESTree.TemplateLiteral | null | undefined,
): void => {
  if (sourceNode === null || sourceNode === void 0) {
    return;
  }

  const sourceSpecifier =
    sourceNode.type === "Literal"
      ? sourceNode.value
      : sourceNode.expressions.length === 0
        ? sourceNode.quasis[0]?.value.cooked
        : void 0;

  if (
    typeof sourceSpecifier !== "string" ||
    !isDirectoryOnlySpecifier(sourceSpecifier)
  ) {
    return;
  }

  context.report({ messageId: "directoryOnlySpecifier", node: sourceNode });
};

/** ESLint rule that forbids relative module specifiers containing only `.` and `..` segments. */
const noDirectoryOnlyImportsRule: Rule.RuleModule = {
  create: (context: Rule.RuleContext): Rule.RuleListener => ({
    ExportAllDeclaration(node: ESTree.ExportAllDeclaration): void {
      reportDirectoryOnlySpecifier(context, node.source);
    },
    ExportNamedDeclaration(node: ESTree.ExportNamedDeclaration): void {
      reportDirectoryOnlySpecifier(context, node.source);
    },
    ImportDeclaration(node: ESTree.ImportDeclaration): void {
      reportDirectoryOnlySpecifier(context, node.source);
    },
    ImportExpression(node: ESTree.ImportExpression): void {
      if (
        node.source.type === "Literal" ||
        node.source.type === "TemplateLiteral"
      ) {
        reportDirectoryOnlySpecifier(context, node.source);
      }
    },
    TSImportType(node: Rule.Node): void {
      const sourceNode = (node as unknown as TypeScriptImportTypeNode).source;

      reportDirectoryOnlySpecifier(context, sourceNode);
    },
  }),
  meta: {
    docs: {
      description:
        "Forbid relative module specifiers made only from `.` and `..` path segments.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/no-directory-only-imports.md",
    },
    messages: {
      directoryOnlySpecifier:
        "Import from a specific module instead of a directory-only path.",
    },
    schema: [],
    type: "problem",
  },
};

export { noDirectoryOnlyImportsRule };
