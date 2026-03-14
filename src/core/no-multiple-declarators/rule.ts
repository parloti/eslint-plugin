import type { Rule } from "eslint";

import { createRuleDocumentation } from "../../custom-rule-documentation";

type Range = [number, number];

interface BaseNode {
  parent?: BaseNode;
  range?: Range;
  type: string;
}

interface ForInOrOfStatementNode extends BaseNode {
  left?: BaseNode;
}

interface ForStatementNode extends BaseNode {
  init?: BaseNode | null;
}

interface SourceCodeAccess {
  getText: (node?: BaseNode) => string;
  text?: string;
}

interface VariableDeclarationNode extends BaseNode {
  declarations?: VariableDeclaratorNode[];
  kind?: string;
}

interface VariableDeclaratorNode extends BaseNode {}

const commentPattern = /\/\/|\/\*/u;
const loopParentTypes = new Set(["ForInStatement", "ForOfStatement"]);

const getSourceCode = (context: Rule.RuleContext): SourceCodeAccess =>
  context.sourceCode as unknown as SourceCodeAccess;

const getSourceText = (sourceCode: SourceCodeAccess): string =>
  typeof sourceCode.text === "string" ? sourceCode.text : sourceCode.getText();

const hasRange = (
  node: BaseNode | undefined,
): node is BaseNode & { range: Range } =>
  Array.isArray(node?.range) && node.range.length === 2;

const hasFixData = (
  node: VariableDeclarationNode,
): node is VariableDeclarationNode & { kind: string; range: Range } =>
  Array.isArray(node.range) &&
  node.range.length === 2 &&
  typeof node.kind === "string";

const isLoopInitializer = (node: VariableDeclarationNode): boolean => {
  const { parent } = node;

  if (parent?.type === "ForStatement") {
    return (parent as ForStatementNode).init === node;
  }

  if (parent !== void 0 && loopParentTypes.has(parent.type)) {
    return (parent as ForInOrOfStatementNode).left === node;
  }

  return false;
};

const isWrappedExport = (node: VariableDeclarationNode): boolean =>
  node.parent?.type === "ExportDefaultDeclaration" ||
  node.parent?.type === "ExportNamedDeclaration";

const getLineIndent = (sourceText: string, start: number): string => {
  const lineStart = sourceText.lastIndexOf("\n", start - 1) + 1;
  const linePrefix = sourceText.slice(lineStart, start);

  return linePrefix.replace(/[^\t ].*$/u, "");
};

const hasSeparatorComment = (
  declarations: readonly VariableDeclaratorNode[],
  sourceText: string,
): boolean => {
  for (const [index, declaration] of declarations.entries()) {
    const nextDeclaration = declarations[index + 1];

    if (nextDeclaration === void 0) {
      break;
    }

    if (!hasRange(declaration) || !hasRange(nextDeclaration)) {
      return true;
    }

    const separatorText = sourceText.slice(
      declaration.range[1],
      nextDeclaration.range[0],
    );

    if (commentPattern.test(separatorText)) {
      return true;
    }
  }

  return false;
};

const canFix = (
  node: VariableDeclarationNode,
  declarations: readonly VariableDeclaratorNode[],
  sourceText: string,
): boolean => {
  if (!hasFixData(node)) {
    return false;
  }

  if (isLoopInitializer(node) || isWrappedExport(node)) {
    return false;
  }

  return !hasSeparatorComment(declarations, sourceText);
};

const buildReplacement = (
  node: VariableDeclarationNode & { kind: string; range: Range },
  declarations: readonly (VariableDeclaratorNode & { range: Range })[],
  sourceCode: SourceCodeAccess,
): string => {
  const sourceText = getSourceText(sourceCode);
  const indent = getLineIndent(sourceText, node.range[0]);

  return declarations
    .map((declaration) => `${node.kind} ${sourceCode.getText(declaration)};`)
    .join(`\n${indent}`);
};

const reportVariableDeclaration = (
  context: Rule.RuleContext,
  node: VariableDeclarationNode,
): void => {
  const declarations = node.declarations ?? [];

  if (declarations.length <= 1) {
    return;
  }

  const sourceCode = getSourceCode(context);
  const sourceText = getSourceText(sourceCode);
  const fixable = canFix(node, declarations, sourceText);

  if (fixable) {
    const fixedNode = node as VariableDeclarationNode & {
      kind: string;
      range: Range;
    };

    context.report({
      fix: (fixer: Rule.RuleFixer): Rule.Fix =>
        fixer.replaceTextRange(
          fixedNode.range,
          buildReplacement(
            fixedNode,
            declarations as (VariableDeclaratorNode & { range: Range })[],
            sourceCode,
          ),
        ),
      messageId: "singleDeclarator",
      node: node as unknown as Rule.Node,
    });

    return;
  }

  context.report({
    messageId: "singleDeclarator",
    node: node as unknown as Rule.Node,
  });
};

const noMultipleDeclaratorsRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      VariableDeclaration: (node: Rule.Node): void => {
        reportVariableDeclaration(context, node as VariableDeclarationNode);
      },
    };
  },
  meta: {
    docs: createRuleDocumentation(
      "no-multiple-declarators",
      "Require variable declarations to contain exactly one declarator per statement.",
    ),
    fixable: "code",
    messages: {
      singleDeclarator:
        "Declare exactly one variable per declaration statement.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { noMultipleDeclaratorsRule };
