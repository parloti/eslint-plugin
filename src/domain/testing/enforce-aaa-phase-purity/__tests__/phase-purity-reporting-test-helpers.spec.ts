import { describe, expect, it } from "vitest";

import type { NodeFlags } from "./phase-purity-reporting-test-helpers";

import {
  collectMessageIds,
  createAnalysis,
  hasFlag,
} from "./phase-purity-reporting-test-helpers";

/** Minimal analysis shape asserted in fixture helper tests. */
interface FixtureAnalysis {
  /** Synthetic call expression anchor. */
  callExpression: unknown;

  /** Section comments derived from requested phases. */
  sectionComments: FixtureSectionComment[];

  /** Statement fixtures passed through unchanged. */
  statements: unknown[];
}

/** Minimal section comment shape asserted in fixture helper tests. */
interface FixtureSectionComment {
  /** Phases represented by one section comment. */
  phases: string[];
}

describe("enforce-aaa-phase-purity phase-purity-reporting-test-helpers", () => {
  it("detects explicitly enabled fixture flags", () => {
    // Arrange
    const node: NodeFlags = {
      containsAwait: true,
      type: "ExpressionStatement",
    };

    // Act
    const actual = hasFlag(node, "containsAwait");

    // Assert
    expect(actual).toBe(true);
  });

  it("rejects fixture flags that are not explicitly true", () => {
    // Arrange
    const node: NodeFlags = {
      containsAwait: false,
      type: "ExpressionStatement",
    };

    // Act
    const actual = hasFlag(node, "containsAwait");

    // Assert
    expect(actual).toBe(false);
  });

  it("builds analysis fixtures with default Act and Assert sections", () => {
    // Arrange
    const statements = [
      { node: { type: "ExpressionStatement" }, phases: ["Act"] },
    ] as never;

    // Act
    const actual = createAnalysis(statements) as unknown as FixtureAnalysis;

    // Assert
    expect(actual.callExpression).toStrictEqual({ type: "CallExpression" });
    expect(actual.sectionComments).toStrictEqual([
      { phases: ["Act"] },
      { phases: ["Assert"] },
    ]);
    expect(actual.statements).toStrictEqual(statements);
  });

  it("builds analysis fixtures with custom sections", () => {
    // Arrange
    const statements = [] as never;

    // Act
    const actual = createAnalysis(statements, [
      "Arrange",
    ]) as unknown as FixtureAnalysis;

    // Assert
    expect(actual.sectionComments).toStrictEqual([{ phases: ["Arrange"] }]);
  });

  it("collects no messages when required sections are missing", () => {
    // Arrange
    const analysis = createAnalysis(
      [{ node: { type: "ExpressionStatement" }, phases: ["Arrange"] }] as never,
      ["Arrange"],
    );

    // Act
    const actualMessages = collectMessageIds(analysis);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });
});
