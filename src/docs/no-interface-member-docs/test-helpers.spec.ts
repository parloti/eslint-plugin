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
    const text = buildSourceText("*\n * ok\n ");

    expect(text).toContain("getLineMeta");
  });

  it("creates interface samples", () => {
    const sample = createInterfaceSample();

    runFunctionListener(sample.context, sample.node);

    expect(sample.reports.length).toBeGreaterThan(0);
  });

  it("creates comment and function helpers", () => {
    const commentValue = "*\n * ok\n ";
    const sourceText = buildSourceText(commentValue);
    const comment = createComment(commentValue, sourceText);
    const { context, reports } = createContext(sourceText, [comment]);
    const node = createFunctionNode(sourceText, [
      createParameter("TSTypeLiteral"),
    ]);

    context.report({ messageId: "ok", node });

    expect(context.sourceCode.getAllComments()[0]?.value).toBe(commentValue);
    expect(node.type).toBe("FunctionDeclaration");
    expect(reports[0]?.messageId).toBe("ok");
  });
});
