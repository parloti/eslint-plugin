import type { Rule } from "eslint";
import type { Comment as EstreeComment, Node as EstreeNode } from "estree";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import {
  normalizeMaxLineLength,
  reportIfSingleLine,
} from "./single-line-jsdoc-utilities";
/** Type union for nodes that may be missing. */
type MaybeNode = EstreeNode | NodeWithType | null | undefined;

/** Shape for export nodes that wrap a declaration. */
interface NodeWithDeclaration {
  /** Declaration wrapped by the export. */
  declaration?: MaybeNode;
}
/** Shape for nodes that have declarations. */
interface NodeWithDeclarations {
  /** Variable declarations for a declaration list. */
  declarations?: VariableDeclarationEntry[];
}
/** Shape for minimal nodes that only expose a type. */
interface NodeWithType {
  /** Node type discriminator. */
  type: string;
}
/** Shape for nodes that have a value. */
interface NodeWithValue {
  /** Value node used for property initializers. */
  value?: MaybeNode;
}
/** SourceCode accessors used by this rule. */
interface SourceCodeAccess {
  /** Returns the node at a range index. */
  getNodeByRangeIndex: (index: number) => EstreeNode | null;

  /** Returns the first token after a comment. */
  getTokenAfter: (
    node: EstreeComment,
    options?: TokenAfterOptions,
  ) => null | TokenWithOptionalRange;
}
/** Type alias for comment nodes provided by ESLint. */
type SourceComment = EstreeComment;
/** Options used when fetching tokens after comments. */
interface TokenAfterOptions {
  /** Whether to include comment tokens. */
  includeComments?: boolean;
}
/** Shape for tokens that may include a range. */
interface TokenWithOptionalRange {
  /** Token range used for lookups. */
  range?: [number, number];
}
/** Shape for tokens with range metadata. */
interface TokenWithRange {
  /** Token range used for lookups. */
  range: [number, number];
}
/** Shape for variable declaration entries. */
interface VariableDeclarationEntry {
  /** Optional initializer for the declaration. */
  init?: MaybeNode;
}

/**
 * Resolves the token after a comment when available.
 * @param sourceCode Source code accessors.
 * @param comment Comment node to inspect.
 * @returns Token range metadata when available.
 * @example
 * ```typescript
 * getTokenAfterRange({} as SourceCodeAccess, {} as SourceComment);
 * ```
 */
const getTokenAfterRange = (
  sourceCode: SourceCodeAccess,
  comment: SourceComment,
): TokenWithRange | undefined => {
  if (typeof sourceCode.getTokenAfter !== "function") {
    return void 0;
  }

  const tokenAfter = sourceCode.getTokenAfter(comment, {
    includeComments: false,
  });

  if (tokenAfter?.range === void 0) {
    return void 0;
  }

  return { range: tokenAfter.range };
};

/**
 * Function-like node types handled directly.
 * @example
 * ```typescript
 * functionLikeTypes.has("TSFunctionType");
 * ```
 */
const functionLikeTypes = new Set<string>([
  "TSCallSignatureDeclaration",
  "TSConstructSignatureDeclaration",
  "TSFunctionType",
]);

/**
 * Checks if a node is a function expression or arrow function.
 * @param node Node to inspect.
 * @returns True when the node is a function expression.
 * @example
 * ```typescript
 * isFunctionExpression({ type: "FunctionExpression" } as EstreeNode);
 * ```
 */
const isFunctionExpression = (node: MaybeNode): boolean =>
  node?.type === "FunctionExpression" || node?.type === "ArrowFunctionExpression";

/**
 * Checks if a node is a function declaration or TS declaration signature.
 * @param node Node to inspect.
 * @returns True when the node is a function declaration.
 * @example
 * ```typescript
 * isFunctionDeclaration({ type: "FunctionDeclaration" } as EstreeNode);
 * ```
 */
const isFunctionDeclaration = (node: MaybeNode): boolean =>
  node?.type === "FunctionDeclaration" || node?.type === "TSDeclareFunction";

/**
 * Checks if a node is a method-like declaration.
 * @param node Node to inspect.
 * @returns True when the node is a method-like declaration.
 * @example
 * ```typescript
 * isMethodLike({ type: "MethodDefinition" } as EstreeNode);
 * ```
 */
const isMethodLike = (node: MaybeNode): boolean =>
  node?.type === "MethodDefinition" || node?.type === "TSMethodSignature";

/**
 * Checks if a node is a property with a function initializer.
 * @param node Node to inspect.
 * @returns True when the property value is a function.
 * @example
 * ```typescript
 * isPropertyWithFunctionValue({ type: "Property" } as EstreeNode);
 * ```
 */
const isPropertyWithFunctionValue = (node: EstreeNode): boolean => {
  if (node.type !== "PropertyDefinition" && node.type !== "Property") {
    return false;
  }

  const { value } = node as NodeWithValue;

  return isFunctionExpression(value);
};

/**
 * Checks if a variable declaration contains a function initializer.
 * @param node Node to inspect.
 * @returns True when any initializer is a function.
 * @example
 * ```typescript
 * isVariableWithFunctionInit({ type: "VariableDeclaration" } as EstreeNode);
 * ```
 */
const isVariableWithFunctionInit = (node: EstreeNode): boolean => {
  if (node.type !== "VariableDeclaration") {
    return false;
  }

  const { declarations } = node as NodeWithDeclarations;
  const initialized = declarations ?? [];

  return initialized.some((declaration) =>
    isFunctionExpression(declaration.init),
  );
};

/**
 * Checks if an export wraps a function-like declaration.
 * @param node Node to inspect.
 * @returns True when the exported declaration is function-like.
 * @example
 * ```typescript
 * isExportedFunctionLike({ type: "ExportNamedDeclaration" } as EstreeNode);
 * ```
 */
const isExportedFunctionLike = (node: EstreeNode): boolean => {
  if (
    node.type !== "ExportNamedDeclaration" &&
    node.type !== "ExportDefaultDeclaration"
  ) {
    return false;
  }

  const { declaration } = node as NodeWithDeclaration;

  return isFunctionLikeNode(declaration);
};

/**
 * Checks if a node represents any supported function-like declaration.
 * @param node Node to inspect.
 * @returns True when the node is function-like.
 * @example
 * ```typescript
 * isFunctionLikeNode({ type: "FunctionDeclaration" } as EstreeNode);
 * ```
 */
const isFunctionLikeNode = (node: MaybeNode): boolean => {
  if (node === null || node === void 0) {
    return false;
  }

  return (
    isFunctionDeclaration(node) ||
    isFunctionExpression(node) ||
    isMethodLike(node) ||
    functionLikeTypes.has(node.type) ||
    isPropertyWithFunctionValue(node as EstreeNode) ||
    isVariableWithFunctionInit(node as EstreeNode) ||
    isExportedFunctionLike(node as EstreeNode)
  );
};

/**
 * Determines whether a JSDoc comment should be skipped for function targets.
 * @param context Rule context.
 * @param comment Comment node to inspect.
 * @returns True when the comment targets a function-like node.
 * @example
 * ```typescript
 * shouldSkipForFunction({} as Rule.RuleContext, {} as SourceComment);
 * ```
 */
const shouldSkipForFunction = (
  context: Rule.RuleContext,
  comment: SourceComment,
): boolean => {
  const sourceCode = context.sourceCode as SourceCodeAccess;
  if (typeof sourceCode.getNodeByRangeIndex !== "function") {
    return false;
  }

  const tokenAfter = getTokenAfterRange(sourceCode, comment);
  if (tokenAfter === void 0) {
    return false;
  }

  const [rangeStart] = tokenAfter.range;
  const node = sourceCode.getNodeByRangeIndex(rangeStart);
  return isFunctionLikeNode(node);
};

/** Rule module enforcing single-line JSDoc when it fits. */
const singleLineJsdocRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    const { options, sourceCode } = context;
    const maxLineLength = normalizeMaxLineLength(options);

    const comments = sourceCode.getAllComments();

    for (const comment of comments) {
      if (!shouldSkipForFunction(context, comment)) {
        reportIfSingleLine(context, comment, maxLineLength);
      }
    }

    return {};
  },
  meta: {
    docs: createRuleDocumentation("single-line-jsdoc", "Require JSDoc comments to use a single line when they fit."),
    fixable: "code",
    messages: {
      singleLine: "Use a single-line JSDoc comment when it fits on one line.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          maxLineLength: {
            minimum: 1,
            type: "number",
          },
        },
        type: "object",
      },
    ],
    type: "layout",
  },
};

export { singleLineJsdocRule };