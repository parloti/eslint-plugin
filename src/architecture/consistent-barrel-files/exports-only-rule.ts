import type { AST, Rule } from "eslint";

import type { BarrelFilesExportsOnlyOptions } from "./types";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import {
  isBarrelFile,
  isLintableModuleFile,
  normalizeAllowedBarrelNames,
} from "./barrel-file-utilities";

/** Stores normalized rule options for the exports-only rule. */
interface BarrelFilesExportsOnlyState {
  /** Allowed barrel basenames for the current rule run. */
  allowedBarrelNames: string[];
  /** Allowed barrel basenames in set form for quick lookups. */
  allowedBarrelNamesSet: Set<string>;
}

/** Describes a declaration-like value that may expose a `type` field. */
interface TypeOnlyDeclarationCandidate {
  /** Candidate declaration type. */
  type?: unknown;
}

/**
 * Builds normalized rule options from raw input.
 * @param options Raw rule options.
 * @returns The normalized exports-only rule state.
 * @example
 * ```typescript
 * const state = getOptions([{}]);
 * ```
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
 * Determines whether a declaration is type-only.
 * @param value Declaration candidate to inspect.
 * @returns True when the declaration is type-only.
 * @example
 * ```typescript
 * const ok = isTypeOnlyDeclaration({ type: "TSInterfaceDeclaration" });
 * ```
 */
const isTypeOnlyDeclaration = (value: unknown): boolean => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const declarationType = (value as TypeOnlyDeclarationCandidate).type;

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
    /**
     * Reports the first invalid barrel statement in the program.
     * @param node Program node to inspect.
     * @example
     * ```typescript
     * listener.Program(programNode);
     * ```
     */
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
  /**
   * Creates listeners for the current lint context.
   * @param context ESLint rule context.
   * @returns The listeners for the context.
   * @example
   * ```typescript
   * const listeners = barrelFilesExportsOnlyRule.create(context);
   * ```
   */
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
