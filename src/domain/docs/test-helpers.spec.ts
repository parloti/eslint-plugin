import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import { applyFixes, createFixer, getFixes, getFixText } from "./test-helpers";

describe("docs test helpers", () => {
  it("extracts fix text", () => {
    // Arrange
    const fixer = createFixer();

    // Act
    const fix = fixer.replaceTextRange([0, 0], "ok");

    // Assert
    expect(getFixText(fix)).toBe("ok");
  });

  it("handles iterable and missing fix text", () => {
    // Arrange
    const fixer = createFixer();

    // Act
    const result = {
      fixText: getFixText([fixer.insertTextAfterRange([0, 0], "ok")]),
      missingFixText: getFixText(),
    };

    // Assert
    expect(result.missingFixText).toBeUndefined();
    expect(result.fixText).toBe("ok");
  });

  it("applies collected fixes", () => {
    // Arrange
    const fixes = getFixes([
      {
        fix: (fixer): Rule.Fix => fixer.replaceTextRange([0, 0], "ok"),
      },
    ]);

    // Act
    const output = applyFixes("", fixes);

    // Assert
    expect(output).toBe("ok");
  });

  it("collects iterable and optional fixes", () => {
    // Arrange
    const fixes = getFixes([
      { fix: void 0 },
      {
        fix: (fixer): Rule.Fix[] => [fixer.insertTextBeforeRange([0, 0], "ok")],
      },
    ]);

    // Act
    const [firstFix] = fixes;

    // Assert
    expect(fixes).toHaveLength(1);
    expect(firstFix?.text).toBe("ok");
  });

  it("creates fixer methods", () => {
    // Arrange
    const fixer = createFixer();
    const syntaxElement = { type: "Identifier" };

    // Act
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

    // Assert
    expect(results).toStrictEqual(["a", "b", "c", "d", "", "", "e", "f"]);
  });
});
