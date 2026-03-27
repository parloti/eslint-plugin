import type { AST, Rule } from "eslint";

import type { BarrelFilesExportsOnlyOptions } from "./types";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import {
  isBarrelFile,
  isLintableModuleFile,
  normalizeAllowedBarrelNames,
} from "./barrel-file-utilities";

/**
 *
 */
interface BarrelFilesExportsOnlyState {
  /**
   *
   */
  allowedBarrelNames: string[];

  /**
   *
   */
  allowedBarrelNamesSet: Set<string>;
}

/**
 * @param options
 * @example
 */
const getOptions = (
  options: readonly unknown[],
): BarrelFilesExportsOnlyState => {
  const rawOptions = options[0] as BarrelFilesExportsOnlyOptions | undefined;
  const allowedBarrelNames = normalizeAllowedBarrelNames(
    rawOptions?.allowedBarrelNames,
  );

  return {
    allowedBarrelNames,
    allowedBarrelNamesSet: new Set(allowedBarrelNames),
  };
};

/**
 * @param value
 * @example
 */
const isTypeOnlyDeclaration = (value: unknown): boolean => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const declarationType = (
    value as {
      /**
       *
       */
      type?: unknown;
    }
  ).type;

  return (
    declarationType === "TSInterfaceDeclaration" ||
    declarationType === "TSTypeAliasDeclaration"
  );
};

/**
 * Checks whether a statement is allowed in a barrel file.
 * @param statement Program statement node.
 * @returns True when the statement is permitted.
 * @example
 * ```typescript
 * const ok = isAllowedBarrelStatement(statement);
 * ```
 */
const isAllowedBarrelStatement = (
  statement: AST.Program["body"][number],
): boolean => {
  if (statement.type === "ExportAllDeclaration") {
    return true;
  }

  if (statement.type !== "ExportNamedDeclaration") {
    return false;
  }

  const declaration = statement.declaration ?? void 0;

  if (declaration !== void 0) {
    return isTypeOnlyDeclaration(declaration);
  }

  const source = statement.source ?? void 0;

  return source !== void 0;
};

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
  options: BarrelFilesExportsOnlyState,
): Rule.RuleListener => {
  if (
    !isLintableModuleFile(filename) ||
    !isBarrelFile(filename, options.allowedBarrelNamesSet)
  ) {
    return {};
  }

  return {
    Program(node: AST.Program): void {
      for (const statement of node.body) {
        if (!isAllowedBarrelStatement(statement)) {
          context.report({
            messageId: "invalidBarrelContent",
            node: statement,
          });
          break;
        }
      }
    },
  };
};

/**
 * ESLint rule enforcing re-export-only barrel files.
 * @example
 * ```typescript
 * const rule = barrelFilesExportsOnlyRule;
 * ```
 */
const barrelFilesExportsOnlyRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return buildListenerForFile(
      context,
      context.filename,
      getOptions(context.options),
    );
  },
  meta: {
    docs: createRuleDocumentation(
      "barrel-files-exports-only",
      "Require barrel files to only contain re-export statements or type-only declarations.",
    ),
    messages: {
      invalidBarrelContent:
        "Barrel files must only contain re-export statements or type-only declarations.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          allowedBarrelNames: {
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

export { barrelFilesExportsOnlyRule };
