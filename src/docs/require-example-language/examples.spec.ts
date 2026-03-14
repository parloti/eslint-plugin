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
    const commentValue = "* @example inline\n * more\n ";
    const examples = getExamples(commentValue);

    expect(examples).toHaveLength(1);
    expect(examples[0]?.content.startsWith("inline")).toBe(true);
    expect(examples[0]?.content).toContain("* more");
  });

  it("accepts a fenced example with language", () => {
    const content = "```typescript\nconst ok = true;\n```";

    expect(checkExampleContent(content)).toBeUndefined();
  });

  it("detects missing fence language", () => {
    const content = "```\nconst ok = true;\n```";

    expect(checkExampleContent(content)).toBe("missingLanguage");
  });

  it("detects missing fences when no code block exists", () => {
    const content = "const ok = true;";

    expect(checkExampleContent(content)).toBe("missingFence");
  });

  it("treats empty content as empty examples", () => {
    expect(checkExampleContent("")).toBe("emptyExample");
  });

  it("treats empty fenced examples as empty examples", () => {
    const content = "```typescript\n```";

    expect(checkExampleContent(content)).toBe("emptyExample");
  });

  it("treats unclosed empty fences as empty examples", () => {
    const content = "```typescript";

    expect(checkExampleContent(content)).toBe("emptyExample");
  });

  it("flags empty fences even when another fence has content", () => {
    const content = "```typescript\n```\n```typescript\nconst ok = true;\n```";

    expect(checkExampleContent(content)).toBe("emptyExample");
  });
});

describe("require-example-language example parsing", () => {
  it("builds an example from a regex match", () => {
    const match = getMatch(
      "* @example inline",
      /^(?<header>\* @example inline)(?<body>)$/u,
    );
    const example = buildExampleFromMatch(match, "* @example inline");

    expect(example.content.startsWith("inline")).toBe(true);
    expect(example.prefix).toBe("* ");
  });

  it("defaults the start offset when index is missing", () => {
    const match = getMatch(
      "* @example inline",
      /^(?<header>\* @example inline)(?<body>)$/u,
    );
    delete match.index;

    const example = buildExampleFromMatch(match, "* @example inline");

    expect(example.startOffset).toBe(0);
  });

  it("falls back when match groups are missing", () => {
    const match = getMatch("* @example", /^.*$/u);
    const example = buildExampleFromMatch(match, "* @example");

    expect(example.content).toBe("");
    expect(example.prefix).toBe("");
  });
});
