import { describe, expect, it } from "vitest";

import {
  buildSourceText,
  createComment,
  createContext,
  createFunctionNode,
  createInterfaceSample,
  createParameter,
  runFunctionListener,
} from "./test-helpers";

describe("no-interface-member-docs test helpers", () => {
  it("builds source text", () => {
    // Arrange
    const text = buildSourceText("*\n * ok\n ");

    // Act & Assert
    expect(text).toContain("getLineMeta");
  });

  it("creates interface samples", () => {
    // Arrange
    const sample = createInterfaceSample();

    // Act
    runFunctionListener(sample.context, sample.node);

    // Assert
    expect(sample.reports.length).toBeGreaterThan(0);
  });

  it("creates comment and function helpers", () => {
    // Arrange
    const commentValue = "*\n * ok\n ";
    const sourceText = buildSourceText(commentValue);
    const comment = createComment(commentValue, sourceText);
    const { context, reports } = createContext(sourceText, [comment]);
    const node = createFunctionNode(sourceText, [
      createParameter("TSTypeLiteral"),
    ]);

    // Act
    context.report({ messageId: "ok", node });

    // Assert
    expect(context.sourceCode.getAllComments()[0]?.value).toBe(commentValue);
    expect(node.type).toBe("FunctionDeclaration");
    expect(reports[0]?.messageId).toBe("ok");
  });
});
