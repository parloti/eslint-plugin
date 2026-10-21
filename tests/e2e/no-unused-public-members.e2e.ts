import { afterAll, describe, expect, it } from "vitest";

import { createTemporaryFixtureManager } from "../support";
import { createFixtureLintRunner } from "../support/no-unused-public-members-fixtures";

describe("no-unused-public-members e2e", () => {
  const fixtureManager = createTemporaryFixtureManager();
  const runFixtureLint = createFixtureLintRunner(fixtureManager);

  afterAll(() => {
    fixtureManager.cleanupTemporaryDirectories();
  });

  it("reports unused public class methods and fields but ignores private members", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "export class Feature {",
          "  unusedMethod(): void {}",
          "  unusedField = 1;",
          "  private hiddenMethod(): void {}",
          "  protected hiddenField = 2;",
          "}",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual(["unusedPublicMember", "unusedPublicMember"]);
  });

  it("checks direct interface and object-type members", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import type { FeatureContract, FeatureShape } from "./feature";',
          "declare const contract: FeatureContract;",
          "declare const shape: FeatureShape;",
          "void contract.used;",
          "contract.run();",
          "void shape.enabled;",
          "shape.reset();",
        ].join("\n"),
        "src/feature.ts": [
          "export interface FeatureContract {",
          "  used: string;",
          "  unused: number;",
          "  run(): void;",
          "  unusedRun(): void;",
          "}",
          "export type FeatureShape = {",
          "  enabled: boolean;",
          "  legacy: boolean;",
          "  reset(): void;",
          "  unusedReset(): void;",
          "};",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual([
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
    ]);
  });

  it("counts same-file and cross-file production references", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import { Feature } from "./feature";',
          "new Feature().usedElsewhere();",
        ].join("\n"),
        "src/feature.ts": [
          "export class Feature {",
          "  usedLocally(): void {}",
          "  usedElsewhere(): void {}",
          "}",
          "new Feature().usedLocally();",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("counts property references through destructuring and indexed access", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import { Feature } from "./feature";',
          "const { selected } = new Feature();",
          'type Indexed = Feature["indexed"];',
          "void selected;",
          "declare const indexed: Indexed;",
          "void indexed;",
        ].join("\n"),
        "src/feature.ts": [
          "export class Feature {",
          "  selected = 1;",
          "  indexed = 2;",
          "}",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("does not treat test-only calls as production use", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.spec.ts": [
          'import { Feature } from "./feature";',
          "new Feature().tested();",
        ].join("\n"),
        "src/feature.ts": "export class Feature { tested(): void {} }",
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual(["unusedPublicMember"]);
  });

  it("exempts hosts re-exported through a configured public API barrel", async () => {
    // Arrange
    const run = {
      files: {
        "src/barrel.ts": 'export { Feature } from "./feature";',
        "src/feature.ts": "export class Feature { downstreamOnly(): void {} }",
        "src/index.ts": 'export { Feature } from "./barrel";',
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("exempts hosts declared directly in public API files", async () => {
    // Arrange
    const run = {
      files: {
        "src/index.ts":
          "export class PublicService { downstreamOnly(): void {} }",
      },
      targetRelativePath: "src/index.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("does not treat test helper exports as production public API", async () => {
    // Arrange
    const run = {
      files: {
        "src/__tests__/index.ts": 'export { Fixture } from "../feature";',
        "src/feature.ts": "export class Fixture { testUtility(): void {} }",
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actual = await runFixtureLint(run);

    // Assert
    expect(actual).toStrictEqual(["unusedPublicMember"]);
  });
});
