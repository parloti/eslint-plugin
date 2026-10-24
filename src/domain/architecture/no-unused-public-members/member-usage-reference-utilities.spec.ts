import { afterAll, describe, expect, it } from "vitest";

import { createTemporaryFixtureManager } from "../../../../tests/support";
import { createFixtureLintRunner } from "../../../../tests/support/no-unused-public-members-fixtures";

describe("no-unused-public-members structural references", () => {
  const fixtureManager = createTemporaryFixtureManager();
  const runFixtureLint = createFixtureLintRunner(fixtureManager);

  afterAll(() => {
    fixtureManager.cleanupTemporaryDirectories();
  });

  it("recognizes dynamic string lookups of the same typed registry", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "export const registry: Readonly<Record<string, number>> = { first: 1, second: 2 };",
          "declare const key: string;",
          "void registry[key];",
          "export const unrelated = { unused: 1 };",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("keeps unrelated registry entries and excluded literal keys reportable", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "export const unusedRegistry: Record<string, number> = { unused: 1 };",
          "declare const otherRegistry: Record<string, number>;",
          "declare const key: string;",
          "void otherRegistry[key];",
          "export const selected = { read: 1, unused: 2 };",
          "void selected['read'];",
          "export const stringKeys = { unused: 1 };",
          "declare const index: number;",
          "void stringKeys[index];",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
    ]);
  });

  it("resolves imported registry aliases without confusing a different registry", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          "import { registry as entries } from './feature';",
          "declare const key: string;",
          "void entries[key];",
        ].join("\n"),
        "src/feature.ts": [
          "export const registry: Record<string, number> = { used: 1 };",
          "export const unused: Record<string, number> = { dead: 2 };",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("recognizes lifecycle calls through smaller structural contracts", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "export class Service {",
          "  private state = true;",
          "  onDestroy(): void {}",
          "  unused(): void {}",
          "}",
          "interface OnDestroy { onDestroy(): void }",
          "declare const instance: OnDestroy;",
          "instance.onDestroy();",
          "export class Incompatible { onDestroy(required: number): void {} }",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([
      "unusedPublicMember",
      "unusedPublicMember",
    ]);
  });

  it("recognizes renamed and optional fields destructured by a for-of loop", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "interface Result { signal: string; intent?: number; unused: boolean }",
          "declare const results: readonly Result[];",
          "for (const { signal: renamed, intent = 0 } of results) { void renamed; void intent; }",
          "export const unrelated = { signal: 'unused', intent: 1 };",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
    ]);
  });

  it("recognizes for-await destructuring from an async iterable", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "interface Result { value: string; unused: boolean }",
          "declare const results: AsyncIterable<Result>;",
          "export async function consume() {",
          "  for await (const { value } of results) { void value; }",
          "}",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });
});
