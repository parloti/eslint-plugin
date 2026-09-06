import { describe, expect, it } from "vitest";

import {
  collectShorthandPropertyFixtureUsages,
  collectTypeFixtureUsages,
  collectTypeofValueFixtureUsages,
  collectValueFixtureUsages,
  EXPORTED_FEATURE_VALUE_ELEMENT,
  MIXED_CONSUMER_FIXTURE_FILES,
} from "./__tests__/no-unused-exports-usage-fixture-helpers";
import { withTemporaryProject } from "./__tests__/no-unused-exports-utilities-test-helpers";
import { getOptions } from "./no-unused-exports-options";
import {
  classifyExportUsage,
  collectCrossFileUsages,
} from "./no-unused-exports-usage-utilities";

describe("no-unused-exports cross-file usages", () => {
  it("classifies production, test-only, and unused exports", () => {
    // Arrange
    const productionUsage = [{ isTestFile: true }, { isTestFile: false }];
    const testOnlyUsage = [{ isTestFile: true }, { isTestFile: true }];

    // Act
    const actualResult = {
      production: classifyExportUsage(productionUsage),
      testOnly: classifyExportUsage(testOnlyUsage),
      unused: classifyExportUsage([]),
    };

    // Assert
    expect(actualResult).toStrictEqual({
      production: "production",
      testOnly: "test-only",
      unused: "unused",
    });
  });

  it("collects cross-file concrete usages for value exports", () => {
    // Act
    const actualUsages = collectValueFixtureUsages();

    // Assert
    expect(actualUsages).toStrictEqual(
      expect.arrayContaining([{ isTestFile: false }, { isTestFile: true }]),
    );
  });

  it("collects cross-file concrete usages for type exports", () => {
    // Act
    const actualUsages = collectTypeFixtureUsages();

    // Assert
    expect(actualUsages).toStrictEqual(
      expect.arrayContaining([{ isTestFile: false }, { isTestFile: true }]),
    );
  });

  it("treats `typeof` references as concrete value usage", () => {
    // Act
    const actualUsages = collectTypeofValueFixtureUsages();

    // Assert
    expect(actualUsages).toStrictEqual([{ isTestFile: false }]);
  });

  it("detects value export consumed as a shorthand property through a barrel chain", () => {
    // Act
    const actualUsages = collectShorthandPropertyFixtureUsages();

    // Assert
    expect(actualUsages).toStrictEqual([{ isTestFile: false }]);
  });

  it("classifies concrete usages across production, test, type, and public API consumers", () => {
    // Arrange & Act
    const actualResult = withTemporaryProject(
      "no-unused-mixed-",
      MIXED_CONSUMER_FIXTURE_FILES,
      (temporaryRoot, program, resolvePath) => {
        const state = getOptions([
          { testFilePatterns: ["tests/**/*.ts", "**/*.spec.ts"] },
        ]);

        // Act
        const actualUsages = collectCrossFileUsages(
          program,
          resolvePath("src/feature.ts"),
          state,
          temporaryRoot,
          EXPORTED_FEATURE_VALUE_ELEMENT,
        );

        return {
          actualUsages,
          classification: classifyExportUsage(actualUsages),
        };
      },
    );

    // Assert
    expect(actualResult.actualUsages).toContainEqual({ isTestFile: false });
    expect(actualResult.actualUsages).toContainEqual({ isTestFile: true });
    expect(actualResult.classification).toBe("production");
  });
});
