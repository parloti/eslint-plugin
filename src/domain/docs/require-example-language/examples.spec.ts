import { describe, expect, it } from "vitest";

import { checkExampleContent, getExamples } from "./examples";

describe("require-example-language content checks", () => {
  it("captures inline example content", () => {
    // Arrange
    const commentValue = "* @example inline\n * more\n ";

    // Act
    const actualExamples = getExamples(commentValue);

    // Assert
    expect(actualExamples).toHaveLength(1);
    expect(actualExamples[0]?.content).toMatch(/^inline/u);
    expect(actualExamples[0]?.content).toContain("* more");
  });

  it("accepts a fenced example with language", () => {
    // Arrange
    const content = "```typescript\nconst ok = true;\n```";

    // Act
    const actualResult = checkExampleContent(content);

    // Assert
    expect(actualResult).toBeUndefined();
  });

  it("detects missing fence language", () => {
    // Arrange
    const content = "```\nconst ok = true;\n```";

    // Act
    const actualResult = checkExampleContent(content);

    // Assert
    expect(actualResult).toBe("missingLanguage");
  });

  it("detects missing fences when no code block exists", () => {
    // Arrange
    const content = "const ok = true;";

    // Act
    const actualResult = checkExampleContent(content);

    // Assert
    expect(actualResult).toBe("missingFence");
  });

  it("treats empty content as empty examples", () => {
    // Arrange
    const content = "";

    // Act
    const actualResult = checkExampleContent(content);

    // Assert
    expect(actualResult).toBe("emptyExample");
  });

  it("treats empty fenced examples as empty examples", () => {
    // Arrange
    const content = "```typescript\n```";

    // Act
    const actualResult = checkExampleContent(content);

    // Assert
    expect(actualResult).toBe("emptyExample");
  });

  it("treats unclosed empty fences as empty examples", () => {
    // Arrange
    const content = "```typescript";

    // Act
    const actualResult = checkExampleContent(content);

    // Assert
    expect(actualResult).toBe("emptyExample");
  });

  it("flags empty fences even when another fence has content", () => {
    // Arrange
    const content = "```typescript\n```\n```typescript\nconst ok = true;\n```";

    // Act
    const actualResult = checkExampleContent(content);

    // Assert
    expect(actualResult).toBe("emptyExample");
  });
});

describe("require-example-language example parsing", () => {
  it("parses examples with expected metadata", () => {
    // Arrange
    const commentValue = ["*", " * @example inline", " * body", " "].join("\n");

    // Act
    const actualExamples = getExamples(commentValue);

    // Assert
    const actualFirstExample = actualExamples[0];

    expect(actualExamples).toHaveLength(1);
    expect(actualFirstExample).toBeDefined();
    expect(actualFirstExample?.content).toContain("inline");
    expect(actualFirstExample?.prefix).toBe(" * ");
    expect(actualFirstExample?.startOffset).toBeTypeOf("number");
  });
});
