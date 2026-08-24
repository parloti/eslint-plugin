import type { Rule } from "eslint";

import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

import type { MockFactoryMatch } from "./rule-detection";

import { collectTopLevelNames } from "./rule-names";

/** Namespace import details for the mocked module. */
interface ModuleTypeImport {
  /** Whether the namespace import already exists in the file. */
  isExisting: boolean;

  /** Namespace identifier used in `typeof Namespace`. */
  namespaceName: string;
}

/** Minimal source-code surface used by the rule. */
type SourceCodeLike = Pick<Rule.RuleContext["sourceCode"], "ast" | "getText">;

/** Default suffix for generated namespace imports. */
const moduleTypeSuffix = "Module";

/**
 * Builds all fixes for one unsafe mock factory.
 * @param context Rule context.
 * @param fixer ESLint fixer.
 * @param match Unsafe mock factory details.
 * @returns All fixer operations.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function buildFixes(
  context: Rule.RuleContext,
  fixer: Rule.RuleFixer,
  match: MockFactoryMatch,
): Rule.Fix[] {
  const sourceCode = context.sourceCode;
  const moduleTypeImport = resolveModuleTypeImport(
    sourceCode,
    match.moduleSpecifier,
  );
  const factoryText = `createMockProxy<typeof ${moduleTypeImport.namespaceName}>(${sourceCode.getText(match.mockExpression as never)})`;
  const fixes: Rule.Fix[] = [
    fixer.replaceTextRange(match.mockFactoryNode.range, factoryText),
  ];

  if (!moduleTypeImport.isExisting) {
    const importText = `import type * as ${moduleTypeImport.namespaceName} from ${JSON.stringify(match.moduleSpecifier)};`;
    const insertionRange = getImportInsertionRange(sourceCode);

    fixes.push(
      insertionRange === void 0
        ? fixer.insertTextBeforeRange([0, 0], `${importText}\n\n`)
        : fixer.insertTextAfterRange(insertionRange, `\n${importText}`),
    );
  }

  return fixes;
}

/**
 * Creates a namespace import name from a module specifier.
 * @param moduleSpecifier Module path.
 * @returns PascalCase namespace name.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function createNamespaceName(moduleSpecifier: string): string {
  const baseName =
    moduleSpecifier
      .split("/")
      .findLast((segment) => segment.length > 0 && segment !== ".")
      ?.replace(/\.[^./\\]+$/, "") ?? "Module";

  const pascalName = baseName
    .replaceAll(/[^\dA-Za-z]+/g, " ")
    .split(" ")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join("");

  return pascalName.endsWith(moduleTypeSuffix)
    ? pascalName
    : `${pascalName}${moduleTypeSuffix}`;
}

/**
 * Returns the range after the final import declaration.
 * @param sourceCode Source code to inspect.
 * @returns Range of the last import statement when present.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getImportInsertionRange(
  sourceCode: SourceCodeLike,
): [number, number] | undefined {
  let lastImportRange: [number, number] | undefined;

  for (const statement of sourceCode.ast.body as unknown as {
    /** Statement range when provided by parser options. */
    range?: [number, number];

    /** Top-level statement node type. */
    type: TSESTree.ProgramStatement["type"];
  }[]) {
    if (
      statement.type === AST_NODE_TYPES.ImportDeclaration &&
      statement.range !== void 0
    ) {
      lastImportRange = statement.range;
    }
  }

  return lastImportRange;
}

/**
 * Resolves the namespace import to use for `typeof Namespace`.
 * @param sourceCode Source code for import inspection.
 * @param moduleSpecifier Module path being mocked.
 * @returns Existing or generated namespace import details.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function resolveModuleTypeImport(
  sourceCode: SourceCodeLike,
  moduleSpecifier: string,
): ModuleTypeImport {
  const statements = sourceCode.ast.body;
  const preferredName = createNamespaceName(moduleSpecifier);

  for (const statement of statements as TSESTree.ProgramStatement[]) {
    if (
      statement.type !== AST_NODE_TYPES.ImportDeclaration ||
      statement.source.value !== moduleSpecifier
    ) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
        return { isExisting: true, namespaceName: specifier.local.name };
      }
    }
  }

  const usedNames = collectTopLevelNames(statements);
  let namespaceName = preferredName;
  let suffix = 1;

  while (usedNames.has(namespaceName)) {
    namespaceName = `${preferredName}${suffix.toFixed(0)}`;
    suffix += 1;
  }

  return { isExisting: false, namespaceName };
}

export { buildFixes };
