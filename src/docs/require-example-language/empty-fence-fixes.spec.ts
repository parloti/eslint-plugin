import { describe, expect, it, vi } from "vitest";

import { parseFenceLine, removeEmptyFences } from "./empty-fence-fixes";

describe("empty fence fixes", () => {
  it("parses fence lines with language", () => {

    // Arrange & Act & Assert
    expect(parseFenceLine(" * ```typescript")).toStrictEqual({
      language: "typescript",
      leading: " * ",
    });
  });

  it("returns undefined for non-fence lines", () => {

    // Arrange & Act & Assert
    expect(parseFenceLine(" * not a fence")).toBeUndefined();
  });

  it("removes empty fences and keeps non-empty fences", () => {
    // Arrange
    const original =
      "* @example\n* ```typescript\n* ```\n* ```typescript\n* const ok = true;\n* ```";

    // Act
    const updated = removeEmptyFences(original);

    // Assert
    expect(updated).toBe(
      "* @example\n* ```typescript\n* const ok = true;\n* ```",
    );
  });

  it("returns undefined when no empty fences are removed", () => {
    // Arrange
    const original = "* ```typescript\n* const ok = true;\n* ```";

    // Act & Assert
    expect(removeEmptyFences(original)).toBeUndefined();
  });

  it("parses fence lines without a language", () => {

    // Arrange & Act & Assert
    expect(parseFenceLine(" * ```")).toStrictEqual({
      language: "",
      leading: " * ",
    });
  });

  it("handles fence lines when regex groups are unavailable", () => {
    // Arrange
    const originalExec = RegExp.prototype.exec;
    const execSpy = vi
      .spyOn(RegExp.prototype, "exec")
      .mockImplementation(function execSpyImplementation(
        this: RegExp,
        value: string,
      ) {
        if (
          this.source ===
            "^(?<leading>\\s*\\*?\\s*)```(?<lang>[^\\s`]+)?[ \\t]*$" &&
          value === " * ```typescript"
        ) {
          return Object.assign([" * ```typescript"], {
            index: 0,
            input: value,
          }) as RegExpExecArray;
        }

        return originalExec.call(this, value);
      });

    // Act
    const parsedFence = (() => {
      try {
        return parseFenceLine(" * ```typescript");
      } finally {
        execSpy.mockRestore();
      }
    })();

    // Assert
    expect(parsedFence).toStrictEqual({
      language: "",
      leading: "",
    });
  });

  it("keeps unclosed fences with content", () => {
    // Arrange
    const original = "* ```typescript\n* const ok = true;";

    // Act & Assert
    expect(removeEmptyFences(original)).toBeUndefined();
  });

  it("returns undefined when only empty fences exist", () => {
    // Arrange
    const original = "* ```typescript\n* ```";

    // Act & Assert
    expect(removeEmptyFences(original)).toBeUndefined();
  });

  it("preserves CRLF line endings when removing empty fences", () => {
    // Arrange
    const original =
      "* @example\r\n* ```typescript\r\n* ```\r\n* ```typescript\r\n* const ok = true;\r\n* ```";

    // Act
    const updated = removeEmptyFences(original);

    // Assert
    expect(updated).toBe(
      "* @example\r\n* ```typescript\r\n* const ok = true;\r\n* ```",
    );
  });
});
