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
    expect(getFenceLanguage(" * ```typescript")).toBe("typescript");
    expect(getFenceLanguage(" * ```")).toBe("");
    expect(getFenceLanguage(" * not a fence")).toBeUndefined();
  });

  it("extracts inline example content", () => {
    expect(getInlineContent("* @example inline")).toBe("inline");
    expect(getInlineContent("* @example")).toBe("");
  });

  it("computes line metadata", () => {
    expect(
      getLineMeta({
        commentValue: "* first\n* second",
        full: "* second",
        startOffset: 8,
      }),
    ).toStrictEqual({ endIndex: 1, endOffset: 16, lineIndex: 1 });
  });

  it("derives prefixes", () => {
    expect(getPrefix(" * @example")).toBe(" * ");
    expect(getPrefix("no tag")).toBe("");
  });

  it("checks line content", () => {
    expect(hasLineContent(" * const ok = true;")).toBe(true);
    expect(hasLineContent(" * ")).toBe(false);
  });
});
