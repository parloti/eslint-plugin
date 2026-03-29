import { describe, expect, it } from "vitest";

import type { Example } from "./types";

import {
  buildMissingFenceFix,
  buildMissingLanguageFix,
} from "./fixes";

describe("require-example-language fixes", () => {
  it("builds missing fence fixes with blank lines", () => {
    // Arrange
    const example: Example = {
      content: "first\n\nsecond",
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: " * ",
      startOffset: 0,
    };

    // Act
    const fixed = buildMissingFenceFix(example);

    // Assert
    expect(fixed).toContain("\n * \n");
    expect(fixed).toContain("```typescript");
  });

  it("builds missing fence fixes when content is empty", () => {
    // Arrange
    const example: Example = {
      content: "",
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: " * ",
      startOffset: 0,
    };

    // Act
    const fixed = buildMissingFenceFix(example);

    // Assert
    expect(fixed).toContain("```typescript");
  });

  it("adds language to CRLF fences", () => {
    // Arrange
    const original = "* ```\r\n* ok\r\n* ```";

    // Act
    const updated = buildMissingLanguageFix(original);

    // Assert
    expect(updated).toContain("```typescript");
    expect(updated).toContain("\r\n");
  });

  it("handles fences without leading whitespace", () => {
    // Arrange
    const original = "```\nconsole.log('ok');\n```";

    // Act
    const updated = buildMissingLanguageFix(original);

    // Assert
    expect(updated).toContain("```typescript");
  });

  it("returns undefined when fences already include language", () => {
    // Arrange
    const original = "* ```typescript\n* ok\n* ```";

    // Act
    const updated = buildMissingLanguageFix(original);

    // Assert
    expect(updated).toBeUndefined();
  });

  it("returns undefined when no fences are present", () => {
    // Arrange
    const original = "* no fences here";

    // Act
    const updated = buildMissingLanguageFix(original);

    // Assert
    expect(updated).toBeUndefined();
  });

  it("normalizes inline and prefixed lines for missing fences", () => {
    // Arrange
    const example: Example = {
      content: 'Demonstrates log info with representative values.\n * logInfo("message");',
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: " * ",
      startOffset: 0,
    };

    // Act
    const actualFixed = buildMissingFenceFix(example);

    // Assert
    expect(actualFixed).toContain(
      "\n *  Demonstrates log info with representative values.",
    );
    expect(actualFixed).toContain('\n *  logInfo("message");');
    expect(actualFixed).not.toContain("\n *   * logInfo");
  });
});
