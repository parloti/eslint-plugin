import type { Rule } from "eslint";

import type { Comment, ParameterMemberTag, TypeAnnotationNode } from "./types";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import {
  buildRemovalRange,
  getCommentLines,
  getCommentText,
  getJsdocComment,
} from "./comment-utilities";
import { parseParameterTagLine } from "./parameter-tags";
import {
  getParameterTypeLookup,
  isNamedTypeReference,
} from "./parameter-utilities";

/** Type definition for rule data. */
interface ReportMemberDocumentationContext {
  /** Comment field value. */
  comment: Comment;

  /** CommentStart field value. */
  commentStart: number;

  /** CommentText field value. */
  commentText: string;

  /** MemberTags field value. */
  memberTags: ParameterMemberTag[];

  /** Node field value. */
  node: Rule.Node;

  /** SourceCode field value. */
  sourceCode: Rule.RuleContext["sourceCode"];
}

/**
 * Checks whether a parameter member tag matches a named type reference.
 * @param tag Parsed parameter member tag.
 * @param parameterTypes Parameter type lookup.
 * @returns True when the tag matches a named type reference.
 * @example
 * ```typescript
 * const ok = isMatchingMemberTag(tag, parameterTypes);
 * ```
 */
const isMatchingMemberTag = (
  tag: ParameterMemberTag | undefined,
  parameterTypes: Map<string, TypeAnnotationNode>,
): tag is ParameterMemberTag => {
  if (tag === void 0) {
    return false;
  }

  const parameterType = parameterTypes.get(tag.baseName);

  return isNamedTypeReference(parameterType);
};

/**
 * Collects member tags from a JSDoc comment.
 * @param commentText Full comment text.
 * @param parameterTypes Parameter type lookup.
 * @returns Member tags that match named type references.
 * @example
 * ```typescript
 * const tags = collectMemberTags(commentText, parameterTypes);
 * ```
 */
const collectMemberTags = (
  commentText: string,
  parameterTypes: Map<string, TypeAnnotationNode>,
): ParameterMemberTag[] =>
  getCommentLines(commentText)
    .map((line) => parseParameterTagLine(line))
    .filter((tag) => isMatchingMemberTag(tag, parameterTypes));

/**
 * Reports interface member documentation entries for removal.
 * @param context Rule execution context.
 * @param details Collected rule details.
 * @example
 * ```typescript
 * reportMemberDocumentation(context, details);
 * ```
 */
const reportMemberDocumentation = (
  context: Rule.RuleContext,
  details: ReportMemberDocumentationContext,
): void => {
  const { commentStart, commentText, memberTags, node } = details;

  for (const tag of memberTags) {
    const removalRange = buildRemovalRange(commentStart, commentText, tag.line);

    context.report({
      data: { parameterName: tag.fullName },
      fix: (fixer: Rule.RuleFixer): Rule.Fix => fixer.removeRange(removalRange),
      messageId: "interfaceMemberDoc",
      node,
    });
  }
};

/**
 * Gets parameter type references for a node.
 * @param node Function-like node to inspect.
 * @returns Parameter type lookup when present.
 * @example
 * ```typescript
 * const lookup = getParameterTypes(node);
 * ```
 */
const getParameterTypes = (
  node: Rule.Node,
): Map<string, TypeAnnotationNode> | undefined => {
  const parameterTypes = getParameterTypeLookup(node);

  return parameterTypes.size > 0 ? parameterTypes : void 0;
};

/**
 * Resolves the JSDoc comment data for a node.
 * @param sourceCode SourceCode wrapper.
 * @param node Node to inspect.
 * @returns JSDoc data when available.
 * @example
 * ```typescript
 * const data = getJsdocData(sourceCode, node);
 * ```
 */
const getJsdocData = (
  sourceCode: Rule.RuleContext["sourceCode"],
  node: Rule.Node,
):
  | undefined
  | {
      /** Comment field value. */
      comment: Comment;

      /** CommentStart field value. */
      commentStart: number;

      /** Text field value. */
      text: string;
    } => {
  const comment = getJsdocComment(sourceCode, node);

  if (comment === void 0) {
    return void 0;
  }

  const commentStart = comment.range?.[0];

  if (typeof commentStart !== "number") {
    return void 0;
  }

  const text = getCommentText(sourceCode, comment);

  return { comment, commentStart, text };
};

/**
 * Resolves the member tag context for a node.
 * @param context Rule execution context.
 * @param node Node to inspect.
 * @returns Member tag context when available.
 * @example
 * ```typescript
 * const context = resolveMemberTagContext(context, node);
 * ```
 */
const resolveMemberTagContext = (
  context: Rule.RuleContext,
  node: Rule.Node,
):
  | undefined
  | {
      /** Comment field value. */
      comment: Comment;

      /** CommentStart field value. */
      commentStart: number;

      /** CommentText field value. */
      commentText: string;

      /** MemberTags field value. */
      memberTags: ParameterMemberTag[];
    } => {
  const parameterTypes = getParameterTypes(node);
  const jsdocData = getJsdocData(context.sourceCode, node);

  if (parameterTypes === void 0 || jsdocData === void 0) {
    return void 0;
  }

  const memberTags = collectMemberTags(jsdocData.text, parameterTypes);

  return memberTags.length > 0
    ? {
        comment: jsdocData.comment,
        commentStart: jsdocData.commentStart,
        commentText: jsdocData.text,
        memberTags,
      }
    : void 0;
};

/**
 * Handles function-like nodes for this rule.
 * @param context Rule execution context.
 * @param node Node to inspect.
 * @example
 * ```typescript
 * handleFunctionLike(context, node);
 * ```
 */
const handleFunctionLike = (
  context: Rule.RuleContext,
  node: Rule.Node,
): void => {
  const resolved = resolveMemberTagContext(context, node);

  if (resolved === void 0) {
    return;
  }

  reportMemberDocumentation(context, {
    comment: resolved.comment,
    commentStart: resolved.commentStart,
    commentText: resolved.commentText,
    memberTags: resolved.memberTags,
    node,
    sourceCode: context.sourceCode,
  });
};

/** ESLint rule disallowing interface member documentation in `@param` tags. */
const noInterfaceMemberDocumentationRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    const listener = (node: Rule.Node): void => {
      handleFunctionLike(context, node);
    };

    return {
      ArrowFunctionExpression: listener,
      FunctionDeclaration: listener,
      FunctionExpression: listener,
      TSCallSignatureDeclaration: listener,
      TSConstructSignatureDeclaration: listener,
      TSDeclareFunction: listener,
      TSFunctionType: listener,
      TSMethodSignature: listener,
    };
  },
  meta: {
    docs: createRuleDocumentation(
      "no-interface-member-docs",
      "Disallow documenting interface members in @param tags; document them on the interface instead.",
    ),
    fixable: "code",
    messages: {
      interfaceMemberDoc:
        "Document interface members on the interface instead of using @param for {{parameterName}}.",
    },
    schema: [],
    type: "problem",
  },
};

export { noInterfaceMemberDocumentationRule };
