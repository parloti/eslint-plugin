import { describe, expect, it, vi } from "vitest";

import { parseFenceLine, removeEmptyFences } from "./empty-fence-fixes";

/**
 * Parses one fence line while forcing the regex-groups fallback path.
 * @param value Fence line to parse.
 * @returns Parsed fence output.
 * @example
 * ```typescript
 * const parsed = parseFenceLineWithoutGroups(" * ```typescript");
 * void parsed;
 * ```
 */
function parseFenceLineWithoutGroups(
  value: string,
): ReturnType<typeof parseFenceLine> {
  const originalExec = RegExp.prototype.exec;
  const execSpy = vi
    .spyOn(RegExp.prototype, "exec")
    .mockImplementation(function execSpyImplementation(
      this: RegExp,
      currentValue: string,
    ): null | RegExpExecArray {
      if (
        currentValue === value &&
        this.source === "^(?<leading>\\s*\\*?\\s*)```(?<lang>[^\\s`]+)?[ \\t]*$"
      ) {
        return Object.assign([value], {
          index: 0,
          input: currentValue,
        }) as RegExpExecArray;
      }

      return originalExec.call(this, currentValue);
    });

  try {
    return parseFenceLine(value);
  } finally {
    execSpy.mockRestore();
  }
}

describe("empty fence fixes", () => {
  it("parses fence lines with language", () => {
    // Arrange
    const line = " * ```typescript";
    const expected = { language: "typescript", leading: " * " };

    // Act
    const actual = parseFenceLine(line);

    // Assert
    expect(actual).toStrictEqual(expected);
  });

  it("returns undefined for non-fence lines", () => {
    // Arrange
    const line = " * not a fence";

    // Act
    const actual = parseFenceLine(line);

    // Assert
    expect(actual).toBeUndefined();
  });

  it("removes empty fences and keeps non-empty fences", () => {
    // Arrange
    const original =
      "* @example\n* ```typescript\n* ```\n* ```typescript\n* const ok = true;\n* ```";

    // Act
    const actualUpdated = removeEmptyFences(original);

    // Assert
    expect(actualUpdated).toBe(
      "* @example\n* ```typescript\n* const ok = true;\n* ```",
    );
  });

  it("returns undefined when no empty fences are removed", () => {
    // Arrange
    const original = "* ```typescript\n* const ok = true;\n* ```";

    // Act
    const actualUpdated = removeEmptyFences(original);

    // Assert
    expect(actualUpdated).toBeUndefined();
  });

  it("parses fence lines without a language", () => {
    // Arrange
    const line = " * ```";
    const expected = { language: "", leading: " * " };

    // Act
    const actual = parseFenceLine(line);

    // Assert
    expect(actual).toStrictEqual(expected);
  });

  it("handles fence lines when regex groups are unavailable", () => {
    // Arrange
    const line = " * ```typescript";

    // Act
    const actualParsedFence = parseFenceLineWithoutGroups(line);

    // Assert
    expect(actualParsedFence).toStrictEqual({ language: "", leading: "" });
  });

  it("keeps unclosed fences with content", () => {
    // Arrange
    const original = "* ```typescript\n* const ok = true;";

    // Act
    const actualUpdated = removeEmptyFences(original);

    // Assert
    expect(actualUpdated).toBeUndefined();
  });

  it("returns undefined when only empty fences exist", () => {
    // Arrange
    const original = "* ```typescript\n* ```";

    // Act
    const actualUpdated = removeEmptyFences(original);

    // Assert
    expect(actualUpdated).toBeUndefined();
  });

  it("preserves CRLF line endings when removing empty fences", () => {
    // Arrange
    const original =
      "* @example\r\n* ```typescript\r\n* ```\r\n* ```typescript\r\n* const ok = true;\r\n* ```";

    // Act
    const actualUpdated = removeEmptyFences(original);

    // Assert
    expect(actualUpdated).toBe(
      "* @example\r\n* ```typescript\r\n* const ok = true;\r\n* ```",
    );
  });
});
