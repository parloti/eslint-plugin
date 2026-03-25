import type { Rule } from "eslint";

import { describe, expect, expectTypeOf, it } from "vitest";

import { applyFixes, getFixes } from "../../docs/test-helpers";
import { noMultipleDeclaratorsRule } from "./rule";

type Range = [number, number];

interface MockNode {
  declarations?: MockNode[];
  init?: MockNode | null;
  kind?: string;
  left?: MockNode;
  parent?: MockNode;
  range?: Range;
  type: string;
}

interface ReportEntry {
  fix: null | Rule.ReportFixer | undefined;
  messageId: string | undefined;
  nodeType: string | undefined;
}

interface RuleContextState {
  context: Rule.RuleContext;
  reports: ReportEntry[];
}

interface ContextOptions {
  omitText?: boolean;
}

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

const createVariableDeclaration = (
  sourceText: string,
  statementText: string,
  declaratorTexts: readonly string[],
  kind: string,
): MockNode => {
  const statementStart = sourceText.indexOf(statementText);
  const statementRange: Range = [
    statementStart + statementText.indexOf(kind),
    statementStart + statementText.length,
  ];
  let searchStart = statementRange[0];
  const declarations = declaratorTexts.map((declaratorText) => {
    const start = sourceText.indexOf(declaratorText, searchStart);
    const range: Range = [start, start + declaratorText.length];
    const declaration: MockNode = {
      range,
      type: "VariableDeclarator",
    };

    searchStart = range[1];

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

const runRule = (context: Rule.RuleContext, node: MockNode): void => {
  const listeners = noMultipleDeclaratorsRule.create(context);
  const listener = listeners.VariableDeclaration as
    | ((value: Rule.Node) => void)
    | undefined;

  listener?.(node as unknown as Rule.Node);
};

describe("no-multiple-declarators rule", () => {
  it("exposes metadata", () => {
    // Arrange
    const meta = noMultipleDeclaratorsRule.meta;

    // Act
    const create = noMultipleDeclaratorsRule.create;

    // Assert
    expect(meta?.type).toBe("suggestion");
    expect(meta?.fixable).toBe("code");
    expect(typeof create).toBe("function");
  });

  it("reports declarations with multiple declarators", () => {
    // Arrange
    const sourceText =
      "const availableRules = rules, customError = buildError();";
    const declaration = createVariableDeclaration(
      sourceText,
      sourceText,
      ["availableRules = rules", "customError = buildError()"],
      "const",
    );
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.nodeType).toBe("VariableDeclaration");
    expect(reports[0]?.fix).toBeTypeOf("function");
  });

  it("skips declarations that already have one declarator", () => {
    // Arrange
    const sourceText = "const availableRules = rules;";
    const declaration = createVariableDeclaration(
      sourceText,
      sourceText,
      ["availableRules = rules"],
      "const",
    );
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("skips malformed declaration nodes without a declarations array", () => {
    // Arrange
    const sourceText = "const availableRules = rules;";
    const declaration: MockNode = {
      kind: "const",
      range: [0, sourceText.length],
      type: "VariableDeclaration",
    };
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("splits standalone declarations with a conservative autofix", () => {
    // Arrange
    const sourceText = [
      "if (ready) {",
      "  const availableRules = new Set(Object.keys(rules ?? {})), customError = buildCustomErrorRules(availableRules);",
      "}",
    ].join("\n");
    const statementText =
      "const availableRules = new Set(Object.keys(rules ?? {})), customError = buildCustomErrorRules(availableRules);";
    const declaration = createVariableDeclaration(
      sourceText,
      statementText,
      [
        "availableRules = new Set(Object.keys(rules ?? {}))",
        "customError = buildCustomErrorRules(availableRules)",
      ],
      "const",
    );
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(applyFixes(sourceText, getFixes(reports))).toBe(
      [
        "if (ready) {",
        "  const availableRules = new Set(Object.keys(rules ?? {}));",
        "  const customError = buildCustomErrorRules(availableRules);",
        "}",
      ].join("\n"),
    );
  });

  it("fixes destructuring declarators when they are otherwise safe", () => {
    // Arrange
    const sourceText =
      "const { availableRules } = source, customError = buildError(availableRules);";
    const declaration = createVariableDeclaration(
      sourceText,
      sourceText,
      [
        "{ availableRules } = source",
        "customError = buildError(availableRules)",
      ],
      "const",
    );
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(applyFixes(sourceText, getFixes(reports))).toBe(
      [
        "const { availableRules } = source;",
        "const customError = buildError(availableRules);",
      ].join("\n"),
    );
  });

  it("fixes let declarations without initializers", () => {
    // Arrange
    const sourceText = "let availableRules, customError = buildError();";
    const declaration = createVariableDeclaration(
      sourceText,
      sourceText,
      ["availableRules", "customError = buildError()"],
      "let",
    );
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(applyFixes(sourceText, getFixes(reports))).toBe(
      ["let availableRules;", "let customError = buildError();"].join("\n"),
    );
  });

  it("falls back to sourceCode.getText() when the text property is unavailable", () => {
    // Arrange
    const sourceText =
      "const availableRules = rules, customError = buildError();";
    const declaration = createVariableDeclaration(
      sourceText,
      sourceText,
      ["availableRules = rules", "customError = buildError()"],
      "const",
    );
    const { context, reports } = createContext(sourceText, { omitText: true });

    // Act
    runRule(context, declaration);

    // Assert
    expect(applyFixes(sourceText, getFixes(reports))).toBe(
      [
        "const availableRules = rules;",
        "const customError = buildError();",
      ].join("\n"),
    );
  });

  it("reports loop initializers without exposing a fix", () => {
    // Arrange
    const sourceText =
      "for (let index = 0, total = 1; index < total; index += 1) {}";
    const declaration = createVariableDeclaration(
      sourceText,
      "let index = 0, total = 1",
      ["index = 0", "total = 1"],
      "let",
    );
    const parent: MockNode = {
      init: declaration,
      type: "ForStatement",
    };

    declaration.parent = parent;
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports for-of loop declarations without exposing a fix", () => {
    // Arrange
    const sourceText = "for (const key of entries) {}";
    const declaration = createVariableDeclaration(
      sourceText,
      "const key of entries",
      ["key", "of entries"],
      "const",
    );
    const parent: MockNode = {
      left: declaration,
      type: "ForOfStatement",
    };

    declaration.parent = parent;
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports separator comments without exposing a fix", () => {
    // Arrange
    const sourceText =
      "const availableRules = rules, /* keep */ customError = buildError();";
    const declaration = createVariableDeclaration(
      sourceText,
      sourceText,
      ["availableRules = rules", "customError = buildError()"],
      "const",
    );
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports declarations with missing declarator ranges without exposing a fix", () => {
    // Arrange
    const sourceText =
      "const availableRules = rules, customError = buildError();";
    const declaration = createVariableDeclaration(
      sourceText,
      sourceText,
      ["availableRules = rules", "customError = buildError()"],
      "const",
    );

    if (declaration.declarations?.[1] !== void 0) {
      delete declaration.declarations[1].range;
    }

    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports declarations without fix metadata when the declaration kind is unavailable", () => {
    // Arrange
    const sourceText =
      "const availableRules = rules, customError = buildError();";
    const declaration = createVariableDeclaration(
      sourceText,
      sourceText,
      ["availableRules = rules", "customError = buildError()"],
      "const",
    );

    delete declaration.kind;
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports exported declarations without exposing a fix", () => {
    // Arrange
    const sourceText =
      "export const availableRules = rules, customError = buildError();";
    const declaration = createVariableDeclaration(
      sourceText,
      "const availableRules = rules, customError = buildError();",
      ["availableRules = rules", "customError = buildError()"],
      "const",
    );
    const parent: MockNode = {
      type: "ExportNamedDeclaration",
    };

    declaration.parent = parent;
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });

  it("reports export-default wrapped declarations without exposing a fix", () => {
    // Arrange
    const sourceText =
      "const availableRules = rules, customError = buildError();";
    const declaration = createVariableDeclaration(
      sourceText,
      sourceText,
      ["availableRules = rules", "customError = buildError()"],
      "const",
    );
    const parent: MockNode = {
      type: "ExportDefaultDeclaration",
    };

    declaration.parent = parent;
    const { context, reports } = createContext(sourceText);

    // Act
    runRule(context, declaration);

    // Assert
    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("singleDeclarator");
    expect(reports[0]?.fix).toBeUndefined();
  });
});
