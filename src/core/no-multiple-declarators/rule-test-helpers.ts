import type { Rule } from "eslint";

import type { Range } from "./types";

import { noMultipleDeclaratorsRule } from "./rule";

/** Options that shape the mock ESLint source access used by the tests. */
interface ContextOptions {
  /** Omits the raw `text` property to exercise the `getText()` fallback path. */
  omitText?: boolean;
}

/** Input used to build a mock variable declaration node. */
interface CreateVariableDeclarationInput {
  /** Individual declarator source fragments in declaration order. */
  declaratorTexts: readonly string[];
  /** Declaration keyword such as `const` or `let`. */
  kind: string;
  /** Full file source used to resolve node ranges. */
  sourceText: string;
  /** Exact statement text that contains the declaration. */
  statementText: string;
}

/** Mock ESTree node shape required by the rule tests. */
interface MockNode {
  /** Variable declarators belonging to a declaration statement. */
  declarations?: MockNode[];
  /** Loop initializer reference used by `ForStatement` parents. */
  init?: MockNode | null;
  /** Declaration keyword such as `const` or `let`. */
  kind?: string;
  /** Loop left-hand reference used by `for...of` and `for...in` parents. */
  left?: MockNode;
  /** Parent node used by the rule to inspect surrounding syntax. */
  parent?: MockNode;
  /** Source range used by the autofix logic. */
  range?: Range;
  /** ESTree node type. */
  type: string;
}

/** Captured report metadata asserted by the unit tests. */
interface ReportEntry {
  /** Fix callback captured from the rule report descriptor. */
  fix: null | Rule.ReportFixer | undefined;
  /** Message identifier reported by the rule. */
  messageId: string | undefined;
  /** Node type captured from the report descriptor. */
  nodeType: string | undefined;
}

/** Captured reports and mock context returned from `createContext`. */
interface RuleContextState {
  /** Mock rule context passed into the rule under test. */
  context: Rule.RuleContext;
  /** Reports captured during rule execution. */
  reports: ReportEntry[];
}

/**
 * Builds a mock ESLint context for the rule tests.
 * @param sourceText Full source text used by the mock source code object.
 * @param options Options that tweak the mock source code shape.
 * @returns The mock context and captured reports.
 * @example Create a context with the default source text access.
 * ```typescript
 * const { context, reports } = createContext("const value = 1;");
 * ```
 */
const createContext = (
  sourceText: string,
  options?: ContextOptions,
): RuleContextState => {
  const reports: ReportEntry[] = [];
  const sourceCode = {
    getText: (node?: MockNode): string => {
      if (node?.range === void 0) {
        return sourceText;
      }

      return sourceText.slice(node.range[0], node.range[1]);
    },
    ...(options?.omitText === true ? {} : { text: sourceText }),
  };
  const context: Rule.RuleContext = {
    id: "no-multiple-declarators",
    options: [],
    report: (descriptor: Rule.ReportDescriptor): void => {
      const messageId =
        "messageId" in descriptor ? descriptor.messageId : void 0;
      const node = "node" in descriptor ? descriptor.node : void 0;

      reports.push({
        fix: descriptor.fix,
        messageId,
        nodeType: node?.type,
      });
    },
    sourceCode,
  } as unknown as Rule.RuleContext;

  return { context, reports };
};

/**
 * Builds a mock variable declaration node with stable source ranges.
 * @param input Source fragments used to build the declaration node.
 * @param input.declaratorTexts Individual declarator source fragments.
 * @param input.kind Declaration keyword such as `const` or `let`.
 * @param input.sourceText Full file source used to resolve ranges.
 * @param input.statementText Exact statement text containing the declaration.
 * @returns A mock variable declaration node with linked declarator parents.
 * @example Build a declaration with two declarators.
 * ```typescript
 * const declaration = createVariableDeclaration({
 *   declaratorTexts: ["first = 1", "second = 2"],
 *   kind: "const",
 *   sourceText: "const first = 1, second = 2;",
 *   statementText: "const first = 1, second = 2;",
 * });
 * ```
 */
const createVariableDeclaration = ({
  declaratorTexts,
  kind,
  sourceText,
  statementText,
}: CreateVariableDeclarationInput): MockNode => {
  const statementOffset = sourceText.indexOf(statementText);
  const statementRange: Range = [
    statementOffset + statementText.indexOf(kind),
    statementOffset + statementText.length,
  ];
  let [searchStart] = statementRange;
  const declarations = declaratorTexts.map((declaratorText) => {
    const start = sourceText.indexOf(declaratorText, searchStart);
    const range: Range = [start, start + declaratorText.length];
    const declaration: MockNode = {
      range,
      type: "VariableDeclarator",
    };
    const [, rangeEnd] = range;

    searchStart = rangeEnd;

    return declaration;
  });
  const declarationNode: MockNode = {
    declarations,
    kind,
    range: statementRange,
    type: "VariableDeclaration",
  };

  for (const declaration of declarations) {
    declaration.parent = declarationNode;
  }

  return declarationNode;
};

/**
 * Executes the rule listener for a variable declaration node.
 * @param context Rule execution context.
 * @param node Declaration node passed to the rule listener.
 * @example Execute the rule against a mock declaration.
 * ```typescript
 * const state = createContext("const first = 1, second = 2;");
 * const declaration = createVariableDeclaration({
 *   declaratorTexts: ["first = 1", "second = 2"],
 *   kind: "const",
 *   sourceText: "const first = 1, second = 2;",
 *   statementText: "const first = 1, second = 2;",
 * });
 * runRule(state.context, declaration);
 * ```
 */
const runRule = (context: Rule.RuleContext, node: MockNode): void => {
  const listeners = noMultipleDeclaratorsRule.create(context);
  const listener = listeners.VariableDeclaration as
    | ((value: Rule.Node) => void)
    | undefined;

  listener?.(node as unknown as Rule.Node);
};

export { createContext, createVariableDeclaration, runRule };
export type { MockNode };
