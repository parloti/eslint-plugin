import { describe, expect, it } from "vitest";

import {
  getFenceLanguage,
  getInlineContent,
  getLineMeta,
  getPrefix,
  hasLineContent,
} from "./example-utilities";

describe("example utilities", () => {
  it("detects fenced languages and non-fences", () => {
    // Arrange
    const typedFenceLanguage = getFenceLanguage(" * ```typescript");

    // Act
    const result = {
      emptyFenceLanguage: getFenceLanguage(" * ```"),
      nonFenceLanguage: getFenceLanguage(" * not a fence"),
    };

    // Assert
    expect(typedFenceLanguage).toBe("typescript");
    expect(result.emptyFenceLanguage).toBe("");
    expect(result.nonFenceLanguage).toBeUndefined();
  });

  it("extracts inline example content", () => {
    // Arrange
    const emptyInlineExample = "* @example";
    const inlineExample = "* @example inline";
    const nonExampleLine = "* @remarks plain";

    // Act
    const result = {
      emptyInlineContent: getInlineContent(emptyInlineExample),
      inlineContent: getInlineContent(inlineExample),
      noExampleContent: getInlineContent(nonExampleLine),
    };

    // Assert
    expect(result.inlineContent).toBe("inline");
    expect(result.emptyInlineContent).toBe("");
    expect(result.noExampleContent).toBe("");
  });

  it("computes line metadata", () => {
    // Arrange
    const context = {
      commentValue: "* first\n* second",
      full: "* second",
      startOffset: 8,
    };

    // Act
    const actualMeta = getLineMeta(context);

    // Assert
    expect(actualMeta).toStrictEqual({
      endIndex: 1,
      endOffset: 16,
      lineIndex: 1,
    });
  });

  it("derives prefixes", () => {
    // Arrange
    const exampleLine = " * @example";
    const plainLine = "no tag";

    // Act
    const prefixes = {
      examplePrefix: getPrefix(exampleLine),
      noTagPrefix: getPrefix(plainLine),
    };

    // Assert
    expect(prefixes.examplePrefix).toBe(" * ");
    expect(prefixes.noTagPrefix).toBe("");
  });

  it("checks line content", () => {
    // Arrange
    const contentLine = " * const ok = true;";
    const prefixOnlyLine = " * ";

    // Act
    const result = {
      hasContent: hasLineContent(contentLine),
      hasOnlyPrefix: hasLineContent(prefixOnlyLine),
    };

    // Assert
    expect(result.hasContent).toBe(true);
    expect(result.hasOnlyPrefix).toBe(false);
  });
});
