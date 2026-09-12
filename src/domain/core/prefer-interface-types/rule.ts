import type { Rule } from "eslint";

import type {
  TypeAnnotationNode,
  VariableDeclaratorNode,
} from "./rule-utilities";
import type { InlineTypeMatch } from "./types";

import { createAggregateFix } from "./autofix";
import { collectScopeNames } from "./declaration-names";
import {
  allocateNames,
  getParameterBaseName,
  getReturnBaseName,
  getVariableBaseName,
} from "./naming";
import {
  getInlineObjectTypeLiteral,
  getParameters,
  getReturnTypeAnnotation,
  getTypeAnnotationNode,
} from "./rule-utilities";

/**
 * Reports an inline object type annotation.
 * @param matches Deferred match collection.
 * @param typeAnnotation Type annotation node to report.
 * @param baseName Preferred generated name before normalization.
 * @example
 * ```typescript
 * reportTypeLiteral(context, typeAnnotation);
 * ```
 */
const collectTypeLiteral = (
  matches: InlineTypeMatch[],
  typeAnnotation: TypeAnnotationNode,
  baseName: string,
): void => {
  matches.push({ baseName, node: typeAnnotation });
};

/**
 * Checks function-like nodes for inline object types.
 * @param matches Deferred match collection.
 * @param node Function-like node to check.
 * @example
 * ```typescript
 * checkFunctionLike(context, node);
 * ```
 */
const checkFunctionLike = (
  matches: InlineTypeMatch[],
  node: Rule.Node,
): void => {
  for (const parameter of getParameters(node)) {
    const inlineObjectType = getInlineObjectTypeLiteral(
      getTypeAnnotationNode(parameter),
    );

    if (inlineObjectType !== void 0) {
      collectTypeLiteral(
        matches,
        inlineObjectType,
        getParameterBaseName(parameter),
      );
    }
  }

  const inlineReturnObjectType = getInlineObjectTypeLiteral(
    getReturnTypeAnnotation(node),
  );

  if (inlineReturnObjectType !== void 0) {
    collectTypeLiteral(
      matches,
      inlineReturnObjectType,
      getReturnBaseName(node),
    );
  }
};

/**
 * Checks variable declarators for inline object types.
 * @param matches Deferred match collection.
 * @param node Variable declarator to check.
 * @example
 * ```typescript
 * checkVariableDeclarator(context, node);
 * ```
 */
const checkVariableDeclarator = (
  matches: InlineTypeMatch[],
  node: Rule.Node,
): void => {
  const typedNode = node as VariableDeclaratorNode;

  const inlineObjectType = getInlineObjectTypeLiteral(
    getTypeAnnotationNode(typedNode.id),
  );

  if (inlineObjectType !== void 0) {
    collectTypeLiteral(matches, inlineObjectType, getVariableBaseName(node));
  }
};

/** ESLint rule requiring named interface/type aliases for object types. */
const preferInterfaceTypesRule: Rule.RuleModule = {
  /**
   * Creates listeners that validate function-like and variable annotations.
   * @param context Rule execution context.
   * @returns Rule listener map.
   * @example
   * ```typescript
   * const listeners = preferInterfaceTypesRule.create(context);
   * ```
   */
  create(context: Rule.RuleContext): Rule.RuleListener {
    const matches: InlineTypeMatch[] = [];

    /**
     * Checks function-like nodes for inline object types.
     * @param node Function-like node to inspect.
     * @example
     * ```typescript
     * functionLikeListener(node);
     * ```
     */
    const functionLikeListener = (node: Rule.Node): void => {
      checkFunctionLike(matches, node);
    };

    /**
     * Checks variable declarators for inline object types.
     * @param node Variable declarator to inspect.
     * @example
     * ```typescript
     * variableDeclaratorListener(node);
     * ```
     */
    const variableDeclaratorListener = (node: Rule.Node): void => {
      checkVariableDeclarator(matches, node);
    };

    /**
     * Reports all collected findings and owns the single aggregate fix.
     * @example
     * ```typescript
     * programExitListener();
     * ```
     */
    const programExitListener = (): void => {
      const statements = context.sourceCode.ast.body;
      const scopeManager = context.sourceCode.scopeManager as
        import("./types").ScopeManager | undefined;
      const namedMatches = allocateNames(
        matches,
        statements,
        collectScopeNames(scopeManager),
      );
      const aggregateFix = createAggregateFix(context, namedMatches);

      for (const [index, match] of namedMatches.entries()) {
        context.report({
          ...(index === 0 && aggregateFix !== void 0 && { fix: aggregateFix }),
          messageId: "preferNamedObject",
          node: match.node as unknown as Rule.Node,
        });
      }
    };

    return {
      ArrowFunctionExpression: functionLikeListener,
      FunctionDeclaration: functionLikeListener,
      FunctionExpression: functionLikeListener,
      "Program:exit": programExitListener,
      TSCallSignatureDeclaration: functionLikeListener,
      TSConstructSignatureDeclaration: functionLikeListener,
      TSDeclareFunction: functionLikeListener,
      TSFunctionType: functionLikeListener,
      TSMethodSignature: functionLikeListener,
      VariableDeclarator: variableDeclaratorListener,
    };
  },
  meta: {
    docs: {
      description:
        "Require named interfaces or type aliases for object types in parameters, return types, and variable annotations.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/prefer-interface-types.md",
    },
    fixable: "code",
    messages: {
      preferNamedObject:
        "Use a named interface or type alias instead of an inline object type.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { preferInterfaceTypesRule };
