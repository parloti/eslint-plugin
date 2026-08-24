import type { AST, Rule } from "eslint";

import {
  collectImportedNames,
  getOptions,
  hasImportedExport,
  isBarrelFile,
  shouldLintFile,
} from "./no-reexports-outside-barrels-utilities";

/**
 * Builds a rule listener for the supplied file.
 * @param context Rule execution context.
 * @param filename Absolute filename to lint.
 * @param options Normalized rule options.
 * @returns The rule listener for the file.
 * @example
 * ```typescript
 * const listener = buildListenerForFile(context, filename, state);
 * ```
 */
const buildListenerForFile = (
  context: Rule.RuleContext,
  filename: string,
  options: ReturnType<typeof getOptions>,
): Rule.RuleListener => {
  if (!shouldLintFile(filename, options) || isBarrelFile(filename, options)) {
    return {};
  }

  return {
    Program(node: AST.Program): void {
      const importedNames = collectImportedNames(node.body);

      for (const statement of node.body) {
        const isExportFrom =
          statement.type === "ExportAllDeclaration" ||
          (statement.type === "ExportNamedDeclaration" &&
            statement.source !== null &&
            statement.source !== void 0);

        const isImportedDefaultExport =
          statement.type === "ExportDefaultDeclaration" &&
          statement.declaration.type === "Identifier" &&
          importedNames.has(statement.declaration.name);

        if (isExportFrom) {
          context.report({
            messageId: "reexportNotAllowed",
            node: statement,
          });
        } else if (
          isImportedDefaultExport ||
          hasImportedExport(statement, importedNames)
        ) {
          context.report({
            messageId: "reexportedImport",
            node: statement,
          });
        }
      }
    },
  };
};

/**
 * ESLint rule preventing re-exports outside barrel files.
 * @example
 * ```typescript
 * const rule = noReexportsOutsideBarrelsRule;
 * ```
 */
const noReexportsOutsideBarrelsRule: Rule.RuleModule = {
  create: (context: Rule.RuleContext): Rule.RuleListener =>
    buildListenerForFile(
      context,
      context.filename,
      getOptions(context.options),
    ),
  meta: {
    defaultOptions: [{ allowedBarrelNames: ["index"] }],
    docs: {
      description:
        "Require non-barrel files to export only locally defined values.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/no-reexports-outside-barrels.md",
    },
    messages: {
      reexportedImport:
        "Non-barrel files must not export identifiers imported from other modules.",
      reexportNotAllowed:
        "Non-barrel files must not re-export from other modules.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          allowedBarrelNames: {
            description:
              "Allowed barrel basenames that should be exempt from the re-export restriction.",
            items: { type: "string" },
            minItems: 1,
            type: "array",
          },
        },
        type: "object",
      },
    ],
    type: "problem",
  },
};

export { noReexportsOutsideBarrelsRule };
