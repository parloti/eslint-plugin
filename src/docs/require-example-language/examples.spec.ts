import { describe, expect, it } from "vitest";

import {
  buildExampleFromMatch,
  checkExampleContent,
  getExamples,
} from "./examples";

/**
 * Gets getMatch.
 * @param input Input source text.
 * @param pattern Input regex pattern.
 * @returns Return matched array.
 * @throws {Error} When the regex match is missing.
 * @example
 * ```typescript
 * getMatch();
 * ```
 */
const getMatch = (input: string, pattern: RegExp): RegExpMatchArray => {
  const match = pattern.exec(input);

  if (match === null) {
    throw new Error("Expected example match for test case.");
  }

  return match;
};

describe("require-example-language content checks", () => {
  it("captures inline example content", () => {
    // Arrange
    const commentValue = "* @example inline\n * more\n ";

    // Act
    const examples = getExamples(commentValue);

    // Assert
    expect(examples).toHaveLength(1);
    expect(examples[0]?.content.startsWith("inline")).toBe(true);
    expect(examples[0]?.content).toContain("* more");
  });

  it("accepts a fenced example with language", () => {
    // Arrange
    const content = "```typescript\nconst ok = true;\n```";

    // Act & Assert
    expect(checkExampleContent(content)).toBeUndefined();
  });

  it("detects missing fence language", () => {
    // Arrange
    const content = "```\nconst ok = true;\n```";

    // Act & Assert
    expect(checkExampleContent(content)).toBe("missingLanguage");
  });

  it("detects missing fences when no code block exists", () => {
    // Arrange
    const content = "const ok = true;";

    // Act & Assert
    expect(checkExampleContent(content)).toBe("missingFence");
  });

  it("treats empty content as empty examples", () => {

    // Arrange & Act & Assert
    expect(checkExampleContent("")).toBe("emptyExample");
  });

  it("treats empty fenced examples as empty examples", () => {
    // Arrange
    const content = "```typescript\n```";

    // Act & Assert
    expect(checkExampleContent(content)).toBe("emptyExample");
  });

  it("treats unclosed empty fences as empty examples", () => {
    // Arrange
    const content = "```typescript";

    // Act & Assert
    expect(checkExampleContent(content)).toBe("emptyExample");
  });

  it("flags empty fences even when another fence has content", () => {
    // Arrange
    const content = "```typescript\n```\n```typescript\nconst ok = true;\n```";

    // Act & Assert
    expect(checkExampleContent(content)).toBe("emptyExample");
  });
});

describe("require-example-language example parsing", () => {
  it("builds an example from a regex match", () => {
    // Arrange
    const match = getMatch(
      "* @example inline",
      /^(?<header>\* @example inline)(?<body>)$/u,
    );

    // Act
    const example = buildExampleFromMatch(match, "* @example inline");

    // Assert
    expect(example.content.startsWith("inline")).toBe(true);
    expect(example.prefix).toBe("* ");
  });

  it("defaults the start offset when index is missing", () => {
    // Arrange
    const match = getMatch(
      "* @example inline",
      /^(?<header>\* @example inline)(?<body>)$/u,
    );
    delete match.index;

    // Act
    const example = buildExampleFromMatch(match, "* @example inline");

    // Assert
    expect(example.startOffset).toBe(0);
  });

  it("falls back when match groups are missing", () => {
    // Arrange
    const match = getMatch("* @example", /^.*$/u);

    // Act
    const example = buildExampleFromMatch(match, "* @example");

    // Assert
    expect(example.content).toBe("");
    expect(example.prefix).toBe("");
  });
});
