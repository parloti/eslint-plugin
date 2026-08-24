import * as ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  collectEmptyPublicApiFixtureUsages,
  collectForwardingOnlyFixtureUsages,
  collectOtherPublicApiFixtureUsages,
  collectPublicApiExposureFixtureUsages,
} from "./__tests__/no-unused-exports-public-api-fixture-helpers";
import { EXPORTED_FEATURE_VALUE_ELEMENT } from "./__tests__/no-unused-exports-usage-fixture-helpers";
import {
  createFakeProgram,
  createFakeSymbol,
  withTemporaryProject,
} from "./__tests__/no-unused-exports-utilities-test-helpers";
import { getOptions } from "./no-unused-exports-options";
import { collectCrossFileUsages } from "./no-unused-exports-usage-utilities";

/** Relative file contents providing paths for the fake-checker fixtures. */
const PUBLIC_API_ALIAS_FIXTURE_FILES = {
  "src/feature.ts": "export const feature = 1;\n",
  "src/index.ts": "export { feature as exposed } from './feature';\n",
};

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
      (temporaryRoot, _program, resolvePath) => {
        const featureFile = resolvePath("src/feature.ts");
        const apiFile = resolvePath("src/index.ts");

        const featureSourceFile = ts.createSourceFile(
          featureFile,
          "export const feature = 1;\n",
          ts.ScriptTarget.ESNext,
          true,
          ts.ScriptKind.TS,
        );
        const apiSourceFile = ts.createSourceFile(
          apiFile,
          "export { feature as exposed } from './feature';\n",
          ts.ScriptTarget.ESNext,
          true,
          ts.ScriptKind.TS,
        );

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

            if (moduleSymbol === moduleSymbolApi) {
              return [exposedSymbol];
            }

            return [];
          },
          getSymbolAtLocation: (node: unknown) => {
            if (node === featureSourceFile) {
              return moduleSymbolFeature;
            }

            if (node === apiSourceFile) {
              return moduleSymbolApi;
            }

            return void 0;
          },
        } as never;

        const program = createFakeProgram(
          [featureSourceFile, apiSourceFile],
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
      (temporaryRoot, _program, resolvePath) => {
        const featureFile = resolvePath("src/feature.ts");
        const apiFile = resolvePath("src/index.ts");

        const featureSourceFile = ts.createSourceFile(
          featureFile,
          "export const feature = 1;\n",
          ts.ScriptTarget.ESNext,
          true,
          ts.ScriptKind.TS,
        );
        const apiSourceFile = ts.createSourceFile(
          apiFile,
          "export const other = 1;\n",
          ts.ScriptTarget.ESNext,
          true,
          ts.ScriptKind.TS,
        );

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

            if (moduleSymbol === moduleSymbolApi) {
              return [otherSymbol];
            }

            return [];
          },
          getSymbolAtLocation: (node: unknown) => {
            if (node === featureSourceFile) {
              return moduleSymbolFeature;
            }

            if (node === apiSourceFile) {
              return moduleSymbolApi;
            }

            return void 0;
          },
        } as never;

        const program = createFakeProgram(
          [featureSourceFile, apiSourceFile],
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
