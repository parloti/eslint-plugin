import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import { applyFixes, createFixer, getFixes, getFixText } from "./test-helpers";

describe("docs test helpers", () => {
  it("extracts fix text", () => {
    const fixer = createFixer();
    const fix = fixer.replaceTextRange([0, 0], "ok");

    expect(getFixText(fix)).toBe("ok");
  });

  it("handles iterable and missing fix text", () => {
    const fixer = createFixer();
    const fix = fixer.insertTextAfterRange([0, 0], "ok");

    expect(getFixText()).toBeUndefined();
    expect(getFixText([fix])).toBe("ok");
  });

  it("applies collected fixes", () => {
    const fixes = getFixes([
      {
        fix: (fixer): Rule.Fix => fixer.replaceTextRange([0, 0], "ok"),
      },
    ]);
    const output = applyFixes("", fixes);

    expect(output).toBe("ok");
  });

  it("collects iterable and optional fixes", () => {
    const fixes = getFixes([
      { fix: void 0 },
      {
        fix: (fixer): Rule.Fix[] => [fixer.insertTextBeforeRange([0, 0], "ok")],
      },
    ]);

    expect(fixes).toHaveLength(1);
    expect(fixes[0]?.text).toBe("ok");
  });

  it("creates fixer methods", () => {
    const fixer = createFixer();
    const syntaxElement = { type: "Identifier" };

    const results = [
      fixer.insertTextAfter(syntaxElement, "a").text,
      fixer.insertTextAfterRange([0, 0], "b").text,
      fixer.insertTextBefore(syntaxElement, "c").text,
      fixer.insertTextBeforeRange([0, 0], "d").text,
      fixer.remove(syntaxElement).text,
      fixer.removeRange([0, 0]).text,
      fixer.replaceText(syntaxElement, "e").text,
      fixer.replaceTextRange([0, 0], "f").text,
    ];

    expect(results).toStrictEqual(["a", "b", "c", "d", "", "", "e", "f"]);
  });
});
