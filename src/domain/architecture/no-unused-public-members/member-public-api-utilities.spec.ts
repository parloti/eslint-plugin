import { afterAll, describe, expect, it } from "vitest";

import { createTemporaryFixtureManager } from "../../../../tests/support";
import { createFixtureLintRunner } from "../../../../tests/support/no-unused-public-members-fixtures";

describe("no-unused-public-members exported type shapes", () => {
  const fixtureManager = createTemporaryFixtureManager();
  const runFixtureLint = createFixtureLintRunner(fixtureManager);

  afterAll(() => {
    fixtureManager.cleanupTemporaryDirectories();
  });

  it("recognizes internal interfaces exposed through exported unions and intersections", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "interface Buy { isBuy: true; buyOnly: number }",
          "interface Sell { isBuy: false; sellOnly: number }",
          "interface Base { amount: number }",
          "export type Payload = (Buy | Sell) & Base;",
          "export interface Unrelated { unused: boolean }",
        ].join("\n"),
        "src/index.ts": "export type { Payload } from './feature';",
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("recognizes nested property types exposed by an exported type alias", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "interface Detail { downstream: string }",
          "export type Payload = { detail: Detail };",
          "export const unrelated = { unused: true };",
        ].join("\n"),
        "src/index.ts": "export type { Payload } from './feature';",
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("preserves exported class static values and terminates recursive type searches", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "interface Detail { downstream: string }",
          "export class Api { static detail: Detail; }",
          "interface Recursive { next: Recursive; }",
          "export type Cycle = Recursive | undefined;",
          "export const unrelated = { unused: true };",
        ].join("\n"),
        "src/index.ts": "export { Api, type Cycle } from './feature';",
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });
});
