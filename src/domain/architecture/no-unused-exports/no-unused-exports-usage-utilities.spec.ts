import type * as ts from "typescript";

import { describe, expect, it } from "vitest";

import {
  collectEmptyPublicApiFixtureUsages,
  collectForwardingOnlyFixtureUsages,
  collectOtherPublicApiFixtureUsages,
  collectPublicApiExposureFixtureUsages,
} from "./__tests__/no-unused-exports-public-api-fixture-helpers";
import {
  collectClassConsumerFixtureUsages,
  collectShorthandPropertyFixtureUsages,
  collectTypeFixtureUsages,
  collectTypeofValueFixtureUsages,
  collectValueFixtureUsages,
  EXPORTED_FEATURE_VALUE_ELEMENT,
  MIXED_CONSUMER_FIXTURE_FILES,
} from "./__tests__/no-unused-exports-usage-fixture-helpers";
import {
  createFakeProgram,
  createFakeSymbol,
  withTemporaryProject,
} from "./__tests__/no-unused-exports-utilities-test-helpers";
import { getOptions } from "./no-unused-exports-options";
import {
  classifyExportUsage,
  collectCrossFileUsages,
} from "./no-unused-exports-usage-utilities";

/** Relative file contents providing paths for the fake-checker fixtures. */
const PUBLIC_API_ALIAS_FIXTURE_FILES = {
  "src/feature.ts": "export const feature = 1;\n",
  "src/index.ts": "export { feature as exposed } from './feature';\n",
};

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

  describe("no-unused-exports public API usages", () => {
    it("ignores forwarding-only exports outside public API files", () => {
      // Act
      const actualUsages = collectForwardingOnlyFixtureUsages();

      // Assert
      expect(actualUsages).toStrictEqual([]);
    });

    it("collects public API exposure as production usage", () => {
      // Act
      const actualUsages = collectPublicApiExposureFixtureUsages();

      // Assert
      expect(actualUsages).toStrictEqual([{ isTestFile: false }]);
    });

    it("returns no usages for public API files without exports", () => {
      // Arrange & Act
      const actualUsages = collectEmptyPublicApiFixtureUsages();

      // Assert
      expect(actualUsages).toStrictEqual([]);
    });

    it("returns no usages for public API files exporting other symbols", () => {
      // Arrange & Act
      const actualUsages = collectOtherPublicApiFixtureUsages();

      // Assert
      expect(actualUsages).toStrictEqual([]);
    });

    it("resolves aliased public API exports when alias resolution fails", () => {
      // Arrange & Act
      const actualUsages = withTemporaryProject(
        "no-unused-alias-fallback-",
        PUBLIC_API_ALIAS_FIXTURE_FILES,
        (temporaryRoot, fixtureProgram, resolvePath) => {
          // Bind parent pointers before replacing the fixture's checker.
          fixtureProgram.getTypeChecker();
          const featureFile = resolvePath("src/feature.ts");
          const apiFile = resolvePath("src/index.ts");

          const featureSourceFile = fixtureProgram.getSourceFile(featureFile);
          const apiSourceFile = fixtureProgram.getSourceFile(apiFile);

          const featureSymbol = createFakeSymbol(featureFile, "feature", 0);
          const exposedSymbol = createFakeSymbol(featureFile, "feature", 0);
          const moduleSymbolFeature = { fileName: featureFile } as never;
          const moduleSymbolApi = { fileName: apiFile } as never;

          const checker = {
            getAliasedSymbol: () => {
              throw new Error("alias resolution unavailable");
            },
            getExportsOfModule: (moduleSymbol: unknown) => {
              if (moduleSymbol === moduleSymbolFeature) {
                return [featureSymbol];
              }

              return moduleSymbol === moduleSymbolApi ? [exposedSymbol] : [];
            },
            getSymbolAtLocation: (node: unknown) => {
              if (node === featureSourceFile) {
                return moduleSymbolFeature;
              }

              return node === apiSourceFile ? moduleSymbolApi : void 0;
            },
          } as never;

          const program = createFakeProgram(
            [...fixtureProgram.getSourceFiles()],
            checker,
          );
          const state = getOptions([{ publicApiFiles: ["src/index.ts"] }]);

          // Act
          return collectCrossFileUsages(
            program,
            featureFile,
            state,
            temporaryRoot,
            EXPORTED_FEATURE_VALUE_ELEMENT,
          );
        },
      );

      // Assert
      expect(actualUsages).toStrictEqual([{ isTestFile: false }]);
    });

    it("returns no usages when public API exports resolve to different symbols", () => {
      // Arrange & Act
      const actualUsages = withTemporaryProject(
        "no-unused-public-api-miss-",
        PUBLIC_API_ALIAS_FIXTURE_FILES,
        (temporaryRoot, fixtureProgram, resolvePath) => {
          // Bind parent pointers before replacing the fixture's checker.
          fixtureProgram.getTypeChecker();
          const featureFile = resolvePath("src/feature.ts");
          const apiFile = resolvePath("src/index.ts");

          const featureSourceFile = fixtureProgram.getSourceFile(featureFile);
          const apiSourceFile = fixtureProgram.getSourceFile(apiFile);

          const featureSymbol = createFakeSymbol(featureFile, "feature", 0);
          const otherSymbol = createFakeSymbol(apiFile, "other", 0);
          const moduleSymbolFeature = { fileName: featureFile } as never;
          const moduleSymbolApi = { fileName: apiFile } as never;

          const checker = {
            getAliasedSymbol: (symbol: ts.Symbol) => symbol,
            getExportsOfModule: (moduleSymbol: unknown) => {
              if (moduleSymbol === moduleSymbolFeature) {
                return [featureSymbol];
              }

              return moduleSymbol === moduleSymbolApi ? [otherSymbol] : [];
            },
            getSymbolAtLocation: (node: unknown) => {
              if (node === featureSourceFile) {
                return moduleSymbolFeature;
              }

              return node === apiSourceFile ? moduleSymbolApi : void 0;
            },
          } as never;

          const program = createFakeProgram(
            [...fixtureProgram.getSourceFiles()],
            checker,
          );
          const state = getOptions([{ publicApiFiles: ["src/index.ts"] }]);

          // Act
          return collectCrossFileUsages(
            program,
            featureFile,
            state,
            temporaryRoot,
            EXPORTED_FEATURE_VALUE_ELEMENT,
          );
        },
      );

      // Assert
      expect(actualUsages).toStrictEqual([]);
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

  it.each([
    ["extends", "export class Child extends Base {}"],
    ["implements", "export class Implementer implements Base { id = 2; }"],
    ["type annotation", "export const describeBase = (base: Base) => base.id;"],
  ])("treats class reference via %s as usage", (_position, consumerSource) => {
    // Act
    const actualUsages = collectClassConsumerFixtureUsages(consumerSource);

    // Assert
    expect(actualUsages).toStrictEqual([{ isTestFile: false }]);
  });

  it("treats a class expression export used in an extends clause as usage", () => {
    // Act
    const actualUsages = collectClassConsumerFixtureUsages(
      "export class Child extends Base {}",
      "export const Base = class { id = 1; };\n",
    );

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
