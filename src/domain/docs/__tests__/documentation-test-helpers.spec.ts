import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import {
  createFixer,
  getFixes,
  getFixText,
} from "./documentation-test-helpers";

describe("documentation test helpers", () => {
  it("uses node ranges when creating text fixes", () => {
    // Arrange
    const fixer = createFixer();
    const node = { range: [2, 4] } as unknown as Rule.Node;

    // Act
    const actualFixes = [
      fixer.insertTextAfter(node, " after"),
      fixer.insertTextBefore(node, "before "),
      fixer.remove(node),
      fixer.replaceText(node, "replacement"),
    ];

    // Assert
    expect(actualFixes).toStrictEqual([
      { range: [4, 4], text: " after" },
      { range: [2, 2], text: "before " },
      { range: [2, 4], text: "" },
      { range: [2, 4], text: "replacement" },
    ]);
  });

  it("falls back to an empty range when a node has none", () => {
    // Arrange
    const fixer = createFixer();
    const node = {} as Rule.Node;

    // Act
    const actualFixes = [
      fixer.insertTextAfter(node, "after"),
      fixer.insertTextBefore(node, "before"),
      fixer.remove(node),
      fixer.replaceText(node, "replacement"),
    ];

    // Assert
    expect(actualFixes).toStrictEqual([
      { range: [0, 0], text: "after" },
      { range: [0, 0], text: "before" },
      { range: [0, 0], text: "" },
      { range: [0, 0], text: "replacement" },
    ]);
  });

  it("gets text from absent, individual, and iterable fixes", () => {
    // Arrange
    const fix: Rule.Fix = { range: [0, 1], text: "one" };
    const iterableFix = {
      *[Symbol.iterator](): IterableIterator<Rule.Fix> {
        yield fix;
      },
    } as Iterable<Rule.Fix>;

    // Act
    const actualTexts = [
      getFixText(),
      getFixText(fix),
      getFixText(iterableFix),
    ];

    // Assert
    expect(actualTexts).toStrictEqual([void 0, "one", "one"]);
  });

  it("collects individual and iterable report fixes", () => {
    // Arrange
    const individualFix: Rule.Fix = { range: [0, 1], text: "one" };
    const iterableFix: Rule.Fix = { range: [1, 2], text: "two" };
    const iterableResult = {
      *[Symbol.iterator](): IterableIterator<Rule.Fix> {
        yield iterableFix;
      },
    } as Iterable<Rule.Fix>;

    // Act
    const actualFixes = getFixes([
      {},
      { fix: () => individualFix },
      { fix: () => iterableResult },
    ]);

    // Assert
    expect(actualFixes).toStrictEqual([individualFix, iterableFix]);
  });
});
