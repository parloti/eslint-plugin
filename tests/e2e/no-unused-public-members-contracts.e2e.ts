import { afterAll, describe, expect, it } from "vitest";

import { createTemporaryFixtureManager } from "../support";
import { createFixtureLintRunner } from "../support/no-unused-public-members-fixtures";

describe("no-unused-public-members contract e2e", () => {
  const fixtureManager = createTemporaryFixtureManager();
  const runFixtureLint = createFixtureLintRunner(fixtureManager);

  afterAll(() => {
    fixtureManager.cleanupTemporaryDirectories();
  });

  it("links class members used through implemented contracts", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import { Feature } from "./feature";',
          'import type { Runner } from "./contract";',
          "const runner: Runner = new Feature();",
          "runner.run();",
        ].join("\n"),
        "src/contract.ts": [
          "export interface Runner {",
          "  run(): void;",
          "  unused(): void;",
          "}",
        ].join("\n"),
        "src/feature.ts": [
          'import type { Runner } from "./contract";',
          "export class Feature implements Runner {",
          "  run(): void {}",
          "  unused(): void {}",
          "}",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual(["unusedPublicMember"]);
  });

  it("links overridden members used through inherited class types", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "class Base { run(): void {} }",
          "export class Feature extends Base {",
          "  override run(): void {}",
          "  unused(): void {}",
          "}",
          "const base: Base = new Feature();",
          "base.run();",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual(["unusedPublicMember"]);
  });

  it("links const object members to their declared type members", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import { service } from "./feature";',
          "service.run();",
        ].join("\n"),
        "src/contract.ts": [
          "export interface ServiceContract {",
          "  run(): void;",
          "  unused(): void;",
          "}",
        ].join("\n"),
        "src/feature.ts": [
          'import type { ServiceContract } from "./contract";',
          "export const service: ServiceContract = {",
          "  run(): void {},",
          "  unused(): void {},",
          "};",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual(["unusedPublicMember"]);
  });

  it("checks direct const object members without descending into nested objects", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import { feature } from "./feature";',
          "void feature.used;",
          "feature.run();",
          "void feature.nested;",
        ].join("\n"),
        "src/feature.ts": [
          "export const feature = {",
          "  used: 1,",
          "  unused: 2,",
          "  run(): void {},",
          "  unusedRun(): void {},",
          "  nested: { inner: 3 },",
          "};",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual(["unusedPublicMember", "unusedPublicMember"]);
  });
});
