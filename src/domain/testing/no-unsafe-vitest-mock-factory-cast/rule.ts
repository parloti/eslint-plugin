import type { Rule } from "eslint";

import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

/** Unsafe mock-factory match details. */
interface MockFactoryMatch {
  /** Whether the match can be safely autofixed. */
  canAutofix: boolean;

  /** Cast-free partial mock expression. */
  mockExpression: TSESTree.Expression;

  /** Second argument to the Vitest mock call. */
  mockFactoryNode:
    TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression;

  /** First argument to the Vitest mock call. */
  mockSpecifierNode: TSESTree.Expression;

  /** Mocked module specifier. */
  moduleSpecifier: string;

  /** Report node. */
  node: TSESTree.Node;
}

/** Namespace import details for the mocked module. */
interface ModuleTypeImport {
  /** Whether the namespace import already exists in the file. */
  isExisting: boolean;

  /** Namespace identifier used in `typeof Namespace`. */
  namespaceName: string;
}

/** Supported declaration shapes that can introduce top-level names. */
type NamedDeclaration =
  | TSESTree.ClassDeclaration
  | TSESTree.FunctionDeclaration
  | TSESTree.TSEnumDeclaration
  | TSESTree.TSInterfaceDeclaration
  | TSESTree.TSModuleDeclaration
  | TSESTree.TSTypeAliasDeclaration
  | TSESTree.VariableDeclaration;

/** Minimal source-code surface used by the rule. */
type SourceCodeLike = Pick<Rule.RuleContext["sourceCode"], "ast" | "getText">;

/** Supported `vi` mock method names. */
const supportedMockNames = new Set(["doMock", "mock"]);

/** Default suffix for generated namespace imports. */
const moduleTypeSuffix = "Module";

/** Disallows casted `vi.mock` and `vi.doMock` factories. */
const noUnsafeVitestMockFactoryCastRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const match = getMockFactoryMatch(node as TSESTree.CallExpression);
        if (match === void 0) {
          return;
        }

        context.report({
          fix: match.canAutofix
            ? (fixer): Rule.Fix[] => buildFixes(context, fixer, match)
            : void 0,
          messageId: "noUnsafeVitestMockFactoryCast",
          node: match.node,
        });
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: {
      description:
        "Disallow casted vi.mock and vi.doMock factories and prefer createMockProxy(...) for partial module mocks.",
      recommended: true,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/no-unsafe-vitest-mock-factory-cast.md",
    },
    fixable: "code",
    messages: {
      noUnsafeVitestMockFactoryCast:
        "Avoid casting vi.mock/vi.doMock factory results; use createMockProxy(...) with a type-only module import instead.",
    },
    schema: [],
    type: "problem",
  },
};

/** CallExpression argument that is not a spread element. */
type NonSpreadCallExpressionArgument = Exclude<
  TSESTree.CallExpressionArgument,
  TSESTree.SpreadElement
>;

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
 * Collects declaration identifiers from top-level declarations.
 * @param declaration Declaration node.
 * @param names Output name set.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function collectDeclarationNames(
  declaration: NamedDeclaration,
  names: Set<string>,
): void {
  if (
    declaration.type === AST_NODE_TYPES.FunctionDeclaration ||
    declaration.type === AST_NODE_TYPES.ClassDeclaration
  ) {
    if (declaration.id !== null) {
      names.add(declaration.id.name);
    }
    return;
  }

  if (declaration.type === AST_NODE_TYPES.VariableDeclaration) {
    for (const variableDeclaration of declaration.declarations) {
      collectPatternNames(variableDeclaration.id, names);
    }
    return;
  }

  if (
    declaration.type === AST_NODE_TYPES.TSTypeAliasDeclaration ||
    declaration.type === AST_NODE_TYPES.TSInterfaceDeclaration ||
    declaration.type === AST_NODE_TYPES.TSEnumDeclaration
  ) {
    names.add(declaration.id.name);
    return;
  }

  if (declaration.id.type === AST_NODE_TYPES.Identifier) {
    names.add(declaration.id.name);
  }
}

/**
 * Collects identifiers from a binding pattern.
 * @param pattern Binding pattern.
 * @param names Output name set.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function collectPatternNames(pattern: TSESTree.Node, names: Set<string>): void {
  if (pattern.type === AST_NODE_TYPES.Identifier) {
    names.add(pattern.name);
    return;
  }

  if (pattern.type === AST_NODE_TYPES.AssignmentPattern) {
    collectPatternNames(pattern.left, names);
    return;
  }

  if (pattern.type === AST_NODE_TYPES.RestElement) {
    collectPatternNames(pattern.argument, names);
    return;
  }

  if (pattern.type === AST_NODE_TYPES.ArrayPattern) {
    for (const element of pattern.elements) {
      if (element !== null) {
        collectPatternNames(element, names);
      }
    }
  }

  if (pattern.type === AST_NODE_TYPES.ObjectPattern) {
    for (const property of pattern.properties) {
      if (property.type === AST_NODE_TYPES.Property) {
        collectPatternNames(property.value, names);
      }

      if (property.type === AST_NODE_TYPES.RestElement) {
        collectPatternNames(property.argument, names);
      }
    }
  }
}

/**
 * Collects top-level binding names to avoid collisions with inserted imports.
 * @param statements Program statements.
 * @returns All top-level names in the file.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function collectTopLevelNames(statements: readonly unknown[]): Set<string> {
  const names = new Set<string>();

  for (const statement of statements as TSESTree.ProgramStatement[]) {
    if (statement.type === AST_NODE_TYPES.ImportDeclaration) {
      for (const specifier of statement.specifiers) {
        names.add(specifier.local.name);
      }
      continue;
    }

    if (statement.type === AST_NODE_TYPES.ExportNamedDeclaration) {
      if (
        statement.declaration !== null &&
        isNamedDeclaration(statement.declaration)
      ) {
        collectDeclarationNames(statement.declaration, names);
      }
      continue;
    }

    if (statement.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
      if (isNamedDeclaration(statement.declaration)) {
        collectDeclarationNames(statement.declaration, names);
      }
      continue;
    }

    if (isNamedDeclaration(statement)) {
      collectDeclarationNames(statement, names);
    }
  }

  return names;
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
 * Returns the casted expression only when the factory is safe to autofix.
 * @param node Factory expression to inspect.
 * @returns Cast-free expression when the factory can be safely replaced.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getAutofixableMockExpression(
  node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): TSESTree.Expression | undefined {
  if (node.type === AST_NODE_TYPES.ArrowFunctionExpression) {
    if (node.async || node.params.length > 0) {
      return void 0;
    }

    if (node.body.type === AST_NODE_TYPES.BlockStatement) {
      return getAutofixableReturnedCastedExpression(node.body.body);
    }

    return getCastedExpression(node.body);
  }

  if (node.async || node.generator || node.params.length > 0) {
    return void 0;
  }

  return getAutofixableReturnedCastedExpression(node.body.body);
}

/**
 * Finds a casted return value from a single-return factory body.
 * @param statements Function body statements.
 * @returns Returned expression when the factory has exactly one return statement.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getAutofixableReturnedCastedExpression(
  statements: TSESTree.Statement[],
): TSESTree.Expression | undefined {
  if (statements.length !== 1) {
    return void 0;
  }

  const [statement] = statements as [TSESTree.ReturnStatement];
  if (statement.argument === null) {
    return void 0;
  }

  return getCastedExpression(statement.argument);
}

/**
 * Returns the inner expression if the input is a cast expression.
 * @param expression Expression to inspect.
 * @returns Inner expression when the input contains a cast.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getCastedExpression(
  expression: TSESTree.Expression,
): TSESTree.Expression | undefined {
  if (expression.type === AST_NODE_TYPES.TSAsExpression) {
    return stripCastExpressions(expression.expression);
  }

  if (expression.type === AST_NODE_TYPES.TSTypeAssertion) {
    const innerExpression = expression.expression;
    return stripCastExpressions(innerExpression);
  }

  return void 0;
}

/**
 * Returns the partial mock expression after removing a cast wrapper.
 * @param node Factory expression to inspect.
 * @returns Cast-free expression when the factory is unsafe.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getCastedMockExpression(
  node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): TSESTree.Expression | undefined {
  if (node.type === AST_NODE_TYPES.ArrowFunctionExpression) {
    if (node.body.type === AST_NODE_TYPES.BlockStatement) {
      return getReturnedCastedExpression(node.body.body);
    }

    return getCastedExpression(node.body);
  }

  return getReturnedCastedExpression(node.body.body);
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
 * Collects the most appropriate mock-factory match from a `CallExpression`.
 * @param node Call expression to inspect.
 * @returns Unsafe mock factory details when the factory uses a cast.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getMockFactoryMatch(
  node: TSESTree.CallExpression,
): MockFactoryMatch | undefined {
  if (!isVitestMockCall(node) || node.arguments.length < 2) {
    return void 0;
  }

  const [mockSpecifierNode, mockFactoryNode] = node.arguments as [
    TSESTree.CallExpressionArgument,
    TSESTree.CallExpressionArgument,
    ...TSESTree.CallExpressionArgument[],
  ];

  if (
    mockSpecifierNode.type === AST_NODE_TYPES.SpreadElement ||
    mockFactoryNode.type === AST_NODE_TYPES.SpreadElement
  ) {
    return void 0;
  }

  if (
    mockFactoryNode.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
    mockFactoryNode.type !== AST_NODE_TYPES.FunctionExpression
  ) {
    return void 0;
  }

  const moduleSpecifier = getModuleSpecifier(mockSpecifierNode);
  if (moduleSpecifier === void 0) {
    return void 0;
  }

  const mockExpression = getCastedMockExpression(mockFactoryNode);
  if (mockExpression === void 0) {
    return void 0;
  }

  const autofixableExpression = getAutofixableMockExpression(mockFactoryNode);

  return {
    canAutofix: autofixableExpression !== void 0,
    mockExpression: autofixableExpression ?? mockExpression,
    mockFactoryNode,
    mockSpecifierNode,
    moduleSpecifier,
    node,
  };
}

/**
 * Extracts a string module specifier from the first mock argument.
 * @param node First mock argument.
 * @returns Module specifier when statically known.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getModuleSpecifier(
  node: NonSpreadCallExpressionArgument,
): string | undefined {
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === "string") {
    return node.value;
  }

  if (
    node.type === AST_NODE_TYPES.ImportExpression &&
    node.source.type === AST_NODE_TYPES.Literal &&
    typeof node.source.value === "string"
  ) {
    return node.source.value;
  }

  return void 0;
}

/**
 * Finds the casted return value inside a function body.
 * @param statements Function body statements.
 * @returns Returned expression when it is casted.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function getReturnedCastedExpression(
  statements: TSESTree.Statement[],
): TSESTree.Expression | undefined {
  for (const statement of statements) {
    if (statement.type !== AST_NODE_TYPES.ReturnStatement) {
      continue;
    }

    return statement.argument === null
      ? void 0
      : getCastedExpression(statement.argument);
  }

  return void 0;
}

/**
 * Checks whether a node is a declaration that introduces top-level names.
 * @param node Node to inspect.
 * @returns True when the node is a supported declaration.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function isNamedDeclaration(
  node:
    | TSESTree.ExportDefaultDeclaration["declaration"]
    | TSESTree.ProgramStatement,
): node is NamedDeclaration {
  return (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.ClassDeclaration ||
    node.type === AST_NODE_TYPES.VariableDeclaration ||
    node.type === AST_NODE_TYPES.TSTypeAliasDeclaration ||
    node.type === AST_NODE_TYPES.TSInterfaceDeclaration ||
    node.type === AST_NODE_TYPES.TSEnumDeclaration ||
    node.type === AST_NODE_TYPES.TSModuleDeclaration
  );
}

/**
 * Checks whether a call targets `vi.mock` or `vi.doMock`.
 * @param node Call expression to inspect.
 * @returns True when the callee is a supported Vitest mock method.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function isVitestMockCall(node: TSESTree.CallExpression): boolean {
  if (
    node.callee.type !== AST_NODE_TYPES.MemberExpression ||
    node.callee.object.type !== AST_NODE_TYPES.Identifier ||
    node.callee.object.name !== "vi" ||
    node.callee.property.type !== AST_NODE_TYPES.Identifier
  ) {
    return false;
  }

  return supportedMockNames.has(node.callee.property.name);
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

/**
 * Removes nested cast wrappers from an expression.
 * @param expression Expression to normalize.
 * @returns Expression without any surrounding casts.
 * @example
 * ```ts
 * // Internal helper for no-unsafe-vitest-mock-factory-cast.
 * ```
 */
function stripCastExpressions(
  expression: TSESTree.Expression,
): TSESTree.Expression {
  if (expression.type === AST_NODE_TYPES.TSAsExpression) {
    return stripCastExpressions(expression.expression);
  }

  if (expression.type === AST_NODE_TYPES.TSTypeAssertion) {
    return stripCastExpressions(expression.expression);
  }

  return expression;
}

export { noUnsafeVitestMockFactoryCastRule };
