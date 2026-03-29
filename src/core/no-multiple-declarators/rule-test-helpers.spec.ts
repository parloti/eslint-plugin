import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import { createContext, createVariableDeclaration } from "./rule-test-helpers";
import { applyFixes, getFixes } from "./rule.fixes";

describe("no-multiple-declarators rule test helpers", () => {
  it("collects concrete fixes from captured reports", () => {
    // Arrange
    const reports = [
      {
        fix: (): Rule.Fix => ({ range: [0, 0], text: "const first = 1;" }),
      },
    ];

    // Act
    const fixes = getFixes(reports);

    // Assert
    expect(fixes).toStrictEqual([{ range: [0, 0], text: "const first = 1;" }]);
  });

  it("applies fixes from the end of the file toward the start", () => {
    // Arrange
    const sourceText = "const first = 1, second = 2;";
    const secondDeclarator = " second = 2;";

    // Act
    const output = ((): string => {
      const secondDeclaratorStart = sourceText.indexOf(secondDeclarator);

      return applyFixes(sourceText, [
        {
          range: [
            secondDeclaratorStart,
            secondDeclaratorStart + secondDeclarator.length,
          ],
          text: "const second = 2;",
        },
        { range: [0, 16], text: "const first = 1;\n" },
      ]);
    })();

    // Assert
    expect(output).toBe("const first = 1;\nconst second = 2;");
  });

  it("omits the raw text property when requested", () => {
    // Arrange
    const { context } = createContext("const first = 1, second = 2;", {
      omitText: true,
    });

    // Act
    const actual: unknown = Reflect.get(context.sourceCode as object, "text");

    // Assert
    expect(actual).toBeUndefined();
  });

  it("links created declarators back to their declaration node", () => {
    // Arrange
    const declaration = createVariableDeclaration({
      declaratorTexts: ["first = 1", "second = 2"],
      kind: "const",
      sourceText: "const first = 1, second = 2;",
      statementText: "const first = 1, second = 2;",
    });

    // Act
    const actualParent = declaration.declarations?.[0]?.parent;

    // Assert
    expect(actualParent).toBe(declaration);
  });

  it("captures report descriptors even when message data is omitted", () => {
    // Arrange
    const { context, reports } = createContext("const first = 1;");

    // Act
    context.report({ fix: void 0 } as Rule.ReportDescriptor);

    // Assert
    expect(reports).toStrictEqual([
      { fix: void 0, messageId: void 0, nodeType: void 0 },
    ]);
  });
});
