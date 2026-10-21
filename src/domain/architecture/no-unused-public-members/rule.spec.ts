import { Linter } from "eslint";
import { parser } from "typescript-eslint";
import { afterAll, describe, expect, it } from "vitest";

import { createTemporaryFixtureManager } from "../../../../tests/support";
import { createFixtureLintRunner } from "../../../../tests/support/no-unused-public-members-fixtures";
import { noUnusedPublicMembersRule } from "./rule";

describe("no-unused-public-members rule", () => {
  const fixtureManager = createTemporaryFixtureManager();
  const runFixtureLint = createFixtureLintRunner(fixtureManager);

  afterAll(() => {
    fixtureManager.cleanupTemporaryDirectories();
  });

  it("defines its metadata contract", () => {
    // Arrange
    const metadata = noUnusedPublicMembersRule.meta;

    // Act
    const actualResult = {
      description: metadata?.docs?.description,
      messages: Object.keys(metadata?.messages ?? {}),
      schemaIsArray: Array.isArray(metadata?.schema),
      type: metadata?.type,
    };

    // Assert
    expect(actualResult).toStrictEqual({
      description:
        "Disallow public members that are unused by production code unless their host is part of the public API.",
      messages: ["unusedPublicMember"],
      schemaIsArray: true,
      type: "problem",
    });
  });

  it("does not report when TypeScript parser services are unavailable", () => {
    // Arrange
    const linter = new Linter({ configType: "flat" });
    const config = [
      {
        files: ["**/*.ts"],
        languageOptions: { ecmaVersion: 2022, parser, sourceType: "module" },
        plugins: {
          codeperfect: {
            rules: { "no-unused-public-members": noUnusedPublicMembersRule },
          },
        },
        rules: { "codeperfect/no-unused-public-members": "error" },
      },
    ] as Parameters<typeof linter.verify>[1];

    // Act
    const actualMessages = {
      outsideAnalysisScope: linter.verify(
        "export class Example { unused(): void {} }",
        config,
        "README.ts",
      ),
      parserServicesUnavailable: linter.verify(
        "export class Example { unused(): void {} }",
        config,
        "src/example.ts",
      ),
    };

    // Assert
    expect(actualMessages.parserServicesUnavailable).toStrictEqual([]);
    expect(actualMessages.outsideAnalysisScope).toStrictEqual([]);
  });

  it("checks direct public class members and ignores private, protected, and nested declarations", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import { Feature } from "./feature";',
          "const feature = new Feature();",
          "feature.usedElsewhere();",
          "void feature.value;",
        ].join("\n"),
        "src/feature.ts": [
          "export class Feature {",
          "  unusedMethod(): void {}",
          "  unusedField = 1;",
          "  usedElsewhere(): void {}",
          "  private hiddenMethod(): void {}",
          "  protected hiddenField = 2;",
          "  #secret = 3;",
          "  get value(): number { return 1; }",
          "  set value(next: number) { void next; }",
          "  constructor() { this.usedLocally(); }",
          "  usedLocally(): void {}",
          "}",
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

  it("checks direct interface and type-literal members used from production files", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import type { Contract, Shape } from "./feature";',
          "declare const contract: Contract;",
          "declare const shape: Shape;",
          "contract.run();",
          "const { selected: localSelected } = shape;",
          'type Indexed = Shape["indexed"];',
          "declare const indexed: Indexed;",
          "function consume({ indexed: localIndexed }: Shape): void {",
          "  void localIndexed;",
          "}",
          "void localSelected;",
          "void indexed;",
        ].join("\n"),
        "src/feature.ts": [
          "export interface Contract {",
          "  run(): void;",
          "  unusedRun(): void;",
          "}",
          "export type Shape = {",
          "  selected: string;",
          "  indexed: number;",
          "  unused: boolean;",
          "};",
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

  it("links member use through implemented and inherited contracts", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import { Feature } from "./feature";',
          'import type { Runner } from "./contract";',
          "const runner: Runner = new Feature();",
          "runner.run();",
          "const feature = new Feature();",
          "feature.inherited();",
        ].join("\n"),
        "src/contract.ts": [
          "export interface Runner {",
          "  run(): void;",
          "}",
        ].join("\n"),
        "src/feature.ts": [
          'import type { Runner } from "./contract";',
          "class Base { inherited(): void {} }",
          "export class Feature extends Base implements Runner {",
          "  run(): void {}",
          "  unused(): void {}",
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

  it("links const object methods to their declared contract and counts same-file use", async () => {
    // Arrange
    const run = {
      files: {
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
          "service.run();",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("exempts hosts reached through API barrels and honors custom API and test patterns", async () => {
    // Arrange
    const run = {
      files: {
        "src/api.ts": 'export { Feature } from "./barrel";',
        "src/barrel.ts": 'export { Feature } from "./feature";',
        "src/feature.ts": "export class Feature { downstreamOnly(): void {} }",
        "src/internal.ts":
          "export class InternalFeature { testOnly(): void {} }",
        "tests/feature.ts": [
          'import { InternalFeature } from "../src/internal";',
          "new InternalFeature().testOnly();",
        ].join("\n"),
      },
      ruleOptions: [
        {
          publicApiFiles: ["**/src/api.ts"],
          testFilePatterns: ["**/tests/**/*.ts"],
        },
      ],
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const [actualApiMessages, actualTestOnlyMessages] = await Promise.all([
      runFixtureLint(run),
      runFixtureLint({ ...run, targetRelativePath: "src/internal.ts" }),
    ]);

    // Assert
    expect(actualApiMessages).toStrictEqual([]);
    expect(actualTestOnlyMessages).toStrictEqual(["unusedPublicMember"]);
  });
});
