import type { Rule } from "eslint";

import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";

import { createRuleDocumentation } from "../../custom-rule-documentation";

/**
 *
 */
interface BuildPropertyReplacementContext {
  /**
   *
   */
  checker: ts.TypeChecker;

  /**
   *
   */
  keyName: string;

  /**
   *
   */
  moduleSpecifier: string;

  /**
   *
   */
  property: SupportedProperty;

  /**
   *
   */
  services: ReturnType<typeof ESLintUtils.getParserServices>;

  /**
   *
   */
  sourceText: string;

  /**
   *
   */
  targetPropertySymbol: ts.Symbol;

  /**
   *
   */
  targetType: ts.Type;
}

/**
 *
 */
interface CollectMatchContext {
  /**
   *
   */
  callExpression: TSESTree.CallExpression;

  /**
   *
   */
  checker: ts.TypeChecker;

  /**
   *
   */
  services: ReturnType<typeof ESLintUtils.getParserServices>;

  /**
   *
   */
  sourceText: string;
}

/**
 *
 */
interface MatchResult {
  /**
   *
   */
  replacementText: string;

  /**
   *
   */
  returnExpressionRange: TSESTree.Range;
}

/**
 *
 */
type MessageIds = "preferVitestIncrementalCasts";

/**
 *
 */
type Options = [];

/**
 *
 */
interface OuterCastContext {
  /**
   *
   */
  checker: ts.TypeChecker;

  /**
   *
   */
  propertyNames: ReadonlySet<string>;

  /**
   *
   */
  targetType: ts.Type;
}

/**
 *
 */
interface PropertyReplacement {
  /**
   *
   */
  range: TSESTree.Range;

  /**
   *
   */
  replacementText: string;
}

/**
 *
 */
interface ResolveFactoryTargetTypeContext {
  /**
   *
   */
  callExpression: TSESTree.CallExpression;

  /**
   *
   */
  checker: ts.TypeChecker;

  /**
   *
   */
  factoryArgument:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression;

  /**
   *
   */
  objectExpression: TSESTree.ObjectExpression;

  /**
   *
   */
  services: ReturnType<typeof ESLintUtils.getParserServices>;
}

/**
 *
 */
type SupportedProperty = TSESTree.Property & {
  /**
   *
   */
  computed: false;

  /**
   *
   */
  kind: "init";

  /**
   *
   */
  method: false;

  /**
   *
   */
  value: TSESTree.Expression;
};

/**
 *
 */
const createRule = ESLintUtils.RuleCreator.withoutDocs;

/** Enforce minimal nested casts for `vi.mock`/`vi.doMock` factory return objects. */
const preferVitestIncrementalCastsRule = createRule<Options, MessageIds>({
  create(context) {
    let services: ReturnType<typeof ESLintUtils.getParserServices>;

    try {
      services = ESLintUtils.getParserServices(context);
    } catch {
      return {};
    }

    const checker = services.program.getTypeChecker();
    const sourceText = context.sourceCode.text;

    return {
      CallExpression(node): void {
        const match = collectMatch({
          callExpression: node,
          checker,
          services,
          sourceText,
        });

        if (match === void 0) {
          return;
        }

        context.report({
          fix: (fixer) =>
            fixer.replaceTextRange(
              match.returnExpressionRange,
              match.replacementText,
            ),
          messageId: "preferVitestIncrementalCasts",
          node,
        });
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: createRuleDocumentation(
      "prefer-vitest-incremental-casts",
      "Prefer minimal nested casts in vi.mock/vi.doMock factory return objects when TypeScript rejects the module shape.",
    ),
    fixable: "code",
    messages: {
      preferVitestIncrementalCasts:
        "Normalize the mock factory to the smallest stable set of nested casts needed for the module type.",
    },
    schema: [],
    type: "suggestion",
  },
  name: "prefer-vitest-incremental-casts",
}) as unknown as Rule.RuleModule;

/**
 * @param text
 * @param replacements
 * @param offset
 * @example
 */
function applyTextReplacements(
  text: string,
  replacements: readonly PropertyReplacement[],
  offset: number,
): string {
  return [...replacements]
    .toSorted((left, right) => right.range[0] - left.range[0])
    .reduce((currentText, replacement) => {
      const start = replacement.range[0] - offset;
      const end = replacement.range[1] - offset;

      return `${currentText.slice(0, start)}${replacement.replacementText}${currentText.slice(end)}`;
    }, text);
}

/**
 * @param context
 * @example
 */
function buildPropertyReplacement(
  context: BuildPropertyReplacementContext,
): PropertyReplacement | undefined {
  const {
    checker,
    keyName,
    moduleSpecifier,
    property,
    services,
    sourceText,
    targetPropertySymbol,
    targetType,
  } = context;
  const baseValue = unwrapExpression(property.value);
  const baseValueText = sourceText.slice(
    baseValue.range[0],
    baseValue.range[1],
  );
  const tsBaseValue = services.esTreeNodeToTSNodeMap.get(baseValue);
  const tsPropertyKey = services.esTreeNodeToTSNodeMap.get(property.key);
  const sourceType = checker.getTypeAtLocation(tsBaseValue);
  const propertyTargetType = checker.getTypeOfSymbolAtLocation(
    targetPropertySymbol,
    tsPropertyKey,
  );
  const needsCast = !checker.isTypeAssignableTo(sourceType, propertyTargetType);
  const keyText = sourceText.slice(
    property.key.range[0],
    property.key.range[1],
  );
  const propertyTypeText = `typeof import(${JSON.stringify(moduleSpecifier)})[${JSON.stringify(keyName)}]`;
  const valueText = needsCast
    ? `${baseValueText} as ${propertyTypeText}`
    : baseValueText;
  const replacementText = canUseShorthand(
    property,
    baseValue,
    keyName,
    needsCast,
  )
    ? keyName
    : `${keyText}: ${valueText}`;
  const originalText = sourceText.slice(property.range[0], property.range[1]);

  return originalText === replacementText
    ? void 0
    : { range: property.range, replacementText };
}

/**
 * @param property
 * @param baseValue
 * @param keyName
 * @param needsCast
 * @example
 */
function canUseShorthand(
  property: SupportedProperty,
  baseValue: TSESTree.Expression,
  keyName: string,
  needsCast: boolean,
): boolean {
  return (
    !needsCast &&
    !property.computed &&
    baseValue.type === TSESTree.AST_NODE_TYPES.Identifier &&
    property.key.type === TSESTree.AST_NODE_TYPES.Identifier &&
    property.key.name === keyName &&
    baseValue.name === keyName
  );
}

/**
 * @param context
 * @example
 */
function collectMatch(context: CollectMatchContext): MatchResult | undefined {
  const { callExpression, checker, services, sourceText } = context;
  if (!isVitestMockCall(callExpression)) {
    return void 0;
  }

  const [moduleArgument, factoryArgument] = callExpression.arguments;
  if (
    moduleArgument === void 0 ||
    factoryArgument === void 0 ||
    moduleArgument.type === TSESTree.AST_NODE_TYPES.SpreadElement ||
    factoryArgument.type === TSESTree.AST_NODE_TYPES.SpreadElement
  ) {
    return void 0;
  }

  if (
    factoryArgument.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression &&
    factoryArgument.type !== TSESTree.AST_NODE_TYPES.FunctionExpression
  ) {
    return void 0;
  }

  const moduleSpecifier = getModuleSpecifier(moduleArgument);
  if (moduleSpecifier === void 0) {
    return void 0;
  }

  const returnExpression = getFactoryReturnExpression(factoryArgument);
  if (returnExpression === void 0) {
    return void 0;
  }

  const unwrappedReturnExpression = unwrapExpression(returnExpression);
  if (
    unwrappedReturnExpression.type !== TSESTree.AST_NODE_TYPES.ObjectExpression
  ) {
    return void 0;
  }

  const objectExpression = unwrappedReturnExpression;
  const properties = objectExpression.properties.filter(isSupportedProperty);

  if (properties.length !== objectExpression.properties.length) {
    return void 0;
  }

  const targetType = resolveFactoryTargetType({
    callExpression,
    checker,
    factoryArgument,
    objectExpression,
    services,
  });
  if (targetType === void 0) {
    return void 0;
  }

  const targetProperties = new Map(
    checker
      .getPropertiesOfType(targetType)
      .map((propertySymbol) => [propertySymbol.getName(), propertySymbol]),
  );

  const propertyNames = new Set<string>();
  const replacements: PropertyReplacement[] = [];

  for (const property of properties) {
    const propertyName = getPropertyName(property.key);

    if (propertyName === void 0) {
      return void 0;
    }

    propertyNames.add(propertyName);
    const targetPropertySymbol = targetProperties.get(propertyName);
    if (targetPropertySymbol === void 0) {
      return void 0;
    }

    const replacement = buildPropertyReplacement({
      checker,
      keyName: propertyName,
      moduleSpecifier,
      property,
      services,
      sourceText,
      targetPropertySymbol,
      targetType,
    });

    if (replacement !== void 0) {
      replacements.push(replacement);
    }
  }

  const objectText = applyTextReplacements(
    sourceText.slice(objectExpression.range[0], objectExpression.range[1]),
    replacements,
    objectExpression.range[0],
  );
  const outerCastRequired = isOuterCastRequired({
    checker,
    propertyNames,
    targetType,
  });
  let replacementText = objectText;

  if (outerCastRequired) {
    replacementText = `(${objectText}) as typeof import(${JSON.stringify(moduleSpecifier)})`;
  } else if (
    shouldWrapImplicitObject(
      factoryArgument,
      returnExpression,
      objectExpression,
    )
  ) {
    replacementText = `(${objectText})`;
  }
  const originalText = sourceText.slice(
    returnExpression.range[0],
    returnExpression.range[1],
  );

  return originalText === replacementText
    ? void 0
    : {
        replacementText,
        returnExpressionRange: returnExpression.range,
      };
}

/**
 * @param factoryArgument
 * @example
 */
function getFactoryReturnExpression(
  factoryArgument:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression,
): TSESTree.Expression | undefined {
  if (factoryArgument.body.type !== TSESTree.AST_NODE_TYPES.BlockStatement) {
    return factoryArgument.body;
  }

  const returnStatement = factoryArgument.body.body.find(
    (statement): statement is TSESTree.ReturnStatement =>
      statement.type === TSESTree.AST_NODE_TYPES.ReturnStatement &&
      statement.argument !== null,
  );

  return returnStatement?.argument ?? void 0;
}

/**
 * @param moduleArgument
 * @example
 */
function getModuleSpecifier(
  moduleArgument: TSESTree.Expression,
): string | undefined {
  if (moduleArgument.type === TSESTree.AST_NODE_TYPES.ImportExpression) {
    const { source } = moduleArgument;

    if (
      source.type === TSESTree.AST_NODE_TYPES.Literal &&
      typeof source.value === "string"
    ) {
      return source.value;
    }

    return void 0;
  }

  return moduleArgument.type === TSESTree.AST_NODE_TYPES.Literal &&
    typeof moduleArgument.value === "string"
    ? moduleArgument.value
    : void 0;
}

/**
 * @param propertyKey
 * @example
 */
function getPropertyName(
  propertyKey: TSESTree.PropertyName,
): string | undefined {
  if (propertyKey.type === TSESTree.AST_NODE_TYPES.Identifier) {
    return propertyKey.name;
  }

  const propertyValue = (propertyKey as TSESTree.Literal).value;
  return typeof propertyValue === "string" || typeof propertyValue === "number"
    ? String(propertyValue)
    : void 0;
}

/**
 * @param checker
 * @param targetType
 * @example
 */
function hasObjectShape(checker: ts.TypeChecker, targetType: ts.Type): boolean {
  return (
    checker.getPropertiesOfType(targetType).length > 0 ||
    checker.getSignaturesOfType(targetType, ts.SignatureKind.Call).length > 0 ||
    checker.getSignaturesOfType(targetType, ts.SignatureKind.Construct).length >
      0
  );
}

/**
 * @param context
 * @example
 */
function isOuterCastRequired(context: OuterCastContext): boolean {
  const { checker, propertyNames, targetType } = context;

  if (
    checker.getSignaturesOfType(targetType, ts.SignatureKind.Call).length > 0
  ) {
    return true;
  }

  if (
    checker.getSignaturesOfType(targetType, ts.SignatureKind.Construct).length >
    0
  ) {
    return true;
  }

  return checker
    .getPropertiesOfType(targetType)
    .some(
      (propertySymbol) =>
        (propertySymbol.getFlags() & ts.SymbolFlags.Optional) === 0 &&
        !propertyNames.has(propertySymbol.getName()),
    );
}

/**
 * @param property
 * @example
 */
function isSupportedProperty(
  property: TSESTree.ObjectLiteralElement,
): property is SupportedProperty {
  return (
    property.type === TSESTree.AST_NODE_TYPES.Property &&
    !property.computed &&
    property.kind === "init" &&
    !property.method &&
    property.value.type !== TSESTree.AST_NODE_TYPES.AssignmentPattern
  );
}

/**
 * @param node
 * @example
 */
function isVitestMockCall(node: TSESTree.CallExpression): boolean {
  if (node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
    return false;
  }

  const { object, property } = node.callee;

  return (
    object.type === TSESTree.AST_NODE_TYPES.Identifier &&
    object.name === "vi" &&
    property.type === TSESTree.AST_NODE_TYPES.Identifier &&
    (property.name === "mock" || property.name === "doMock")
  );
}

/**
 * @param checker
 * @param targetType
 * @example
 */
function normalizeObjectLikeType(
  checker: ts.TypeChecker,
  targetType: ts.Type | undefined,
): ts.Type | undefined {
  if (targetType === void 0) {
    return void 0;
  }

  const resolvedType = checker.getAwaitedType(targetType)!;

  if (hasObjectShape(checker, resolvedType)) {
    return resolvedType;
  }

  if (!resolvedType.isUnion()) {
    return void 0;
  }

  const objectLikeTypes = resolvedType.types.filter((type) =>
    hasObjectShape(checker, type),
  );

  return objectLikeTypes.length === 1 ? objectLikeTypes[0] : void 0;
}

/**
 * @param context
 * @example
 */
function resolveFactoryTargetType(
  context: ResolveFactoryTargetTypeContext,
): ts.Type | undefined {
  const {
    callExpression,
    checker,
    factoryArgument,
    objectExpression,
    services,
  } = context;
  const tsObjectExpression =
    services.esTreeNodeToTSNodeMap.get(objectExpression);
  const contextualType = checker.getContextualType(tsObjectExpression);
  const normalizedContextualType = normalizeObjectLikeType(
    checker,
    contextualType,
  );

  if (normalizedContextualType !== void 0) {
    return normalizedContextualType;
  }

  const tsCallExpression = services.esTreeNodeToTSNodeMap.get(callExpression);
  const firstArgument = tsCallExpression.arguments[0]!;
  const secondArgument = tsCallExpression.arguments[1]!;

  const firstArgumentType = checker.getTypeAtLocation(firstArgument);
  const calleeType = checker.getTypeAtLocation(tsCallExpression.expression);

  for (const signature of checker.getSignaturesOfType(
    calleeType,
    ts.SignatureKind.Call,
  )) {
    const [specifierParameter, factoryParameter] = signature.getParameters();

    if (specifierParameter === void 0 || factoryParameter === void 0) {
      continue;
    }

    const specifierParameterType = checker.getTypeOfSymbolAtLocation(
      specifierParameter,
      firstArgument,
    );

    if (
      !checker.isTypeAssignableTo(firstArgumentType, specifierParameterType)
    ) {
      continue;
    }

    const factoryParameterType = checker.getTypeOfSymbolAtLocation(
      factoryParameter,
      services.esTreeNodeToTSNodeMap.get(factoryArgument),
    );

    for (const factorySignature of checker.getSignaturesOfType(
      factoryParameterType,
      ts.SignatureKind.Call,
    )) {
      const normalizedReturnType = normalizeObjectLikeType(
        checker,
        checker.getReturnTypeOfSignature(factorySignature),
      );

      if (normalizedReturnType !== void 0) {
        return normalizedReturnType;
      }
    }
  }

  return void 0;
}

/**
 * @param factoryArgument
 * @param returnExpression
 * @param objectExpression
 * @example
 */
function shouldWrapImplicitObject(
  factoryArgument:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression,
  returnExpression: TSESTree.Expression,
  objectExpression: TSESTree.ObjectExpression,
): boolean {
  return (
    factoryArgument.body.type !== TSESTree.AST_NODE_TYPES.BlockStatement &&
    (returnExpression.range[0] !== objectExpression.range[0] ||
      returnExpression.range[1] !== objectExpression.range[1])
  );
}

/**
 * @param expression
 * @example
 */
function unwrapExpression(
  expression: TSESTree.Expression,
): TSESTree.Expression {
  let currentExpression = expression;

  while (true) {
    switch (currentExpression.type) {
      case TSESTree.AST_NODE_TYPES.TSAsExpression:
      case TSESTree.AST_NODE_TYPES.TSSatisfiesExpression:
      case TSESTree.AST_NODE_TYPES.TSTypeAssertion: {
        currentExpression = currentExpression.expression;
        continue;
      }

      default: {
        return currentExpression;
      }
    }
  }
}

export { preferVitestIncrementalCastsRule };
