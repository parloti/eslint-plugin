import { describe, expect, it } from "vitest";

import { parseParameterTagLine } from "./parameter-tags";

/** Type definition for rule data. */
interface CommentLine {
  /** End field value. */
  end: number;

  /** LineBreakLength field value. */
  lineBreakLength: number;

  /** Start field value. */
  start: number;

  /** Text field value. */
  text: string;
}

/**
 * Creates createLine.
 * @param text Input text value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createLine();
 * ```
 */
const createLine = (text: string): CommentLine => ({
  end: text.length,
  lineBreakLength: 0,
  start: 0,
  text,
});

describe("parameter tag parsing", () => {
  it("parses member parameter tags", () => {
    // Arrange
    const line = createLine(" * @param context.member The description.");

    // Act
    const tag = parseParameterTagLine(line);

    // Assert
    expect(tag?.basename).toBe("context");
    expect(tag?.fullName).toBe("context.member");
  });

  it("parses optional member tags with defaults", () => {
    // Arrange
    const line = createLine(" * @param [context.value=1] The value.");

    // Act
    const tag = parseParameterTagLine(line);

    // Assert
    expect(tag?.basename).toBe("context");
    expect(tag?.fullName).toBe("context.value");
  });

  it("skips base parameter tags", () => {
    // Arrange
    const line = createLine(" * @param context The description.");

    // Act
    const tag = parseParameterTagLine(line);

    // Assert
    expect(tag).toBeUndefined();
  });

  it("skips empty member names", () => {
    // Arrange
    const line = createLine(" * @param context. The description.");

    // Act
    const tag = parseParameterTagLine(line);

    // Assert
    expect(tag).toBeUndefined();
  });

  it("skips non-param lines", () => {
    // Arrange
    const line = createLine(" * @returns The description.");

    // Act
    const tag = parseParameterTagLine(line);

    // Assert
    expect(tag).toBeUndefined();
  });

  it("skips param tags without names", () => {
    // Arrange
    const line = createLine(" * @param");

    // Act
    const tag = parseParameterTagLine(line);

    // Assert
    expect(tag).toBeUndefined();
  });

  it("parses tags with type annotations", () => {
    // Arrange
    const line = createLine(
      " * @param {string} context.member The description.",
    );

    // Act
    const tag = parseParameterTagLine(line);

    // Assert
    expect(tag?.basename).toBe("context");
    expect(tag?.fullName).toBe("context.member");
  });
});
