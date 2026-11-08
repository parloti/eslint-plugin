import { writeFileSync } from "node:fs";
import path from "node:path";
import * as ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import { EXPORTED_FEATURE_VALUE_ELEMENT } from "./__tests__/no-unused-exports-usage-fixture-helpers";
import { withTemporaryProject } from "./__tests__/no-unused-exports-utilities-test-helpers";
import { getOptions } from "./no-unused-exports-options";
import {
  classifyExportUsage,
  collectCrossFileUsages,
} from "./no-unused-exports-usage-utilities";

describe("no-unused-exports Program index", () => {
  it("resolves identifiers once across exports and equivalent option objects", () => {
    // Arrange & Act
    const actualResult = withTemporaryProject(
      "no-unused-index-reuse-",
      {
        "src/consumer.ts": "import { feature } from './feature'; void feature;",
        "src/feature.ts": "export const feature = 1; export const orphan = 2;",
      },
      (root, program, resolvePath) => {
        const symbolLookup = vi.spyOn(
          program.getTypeChecker(),
          "getSymbolAtLocation",
        );
        const relativePathLookup = vi.spyOn(path, "relative");
        const filename = resolvePath("src/feature.ts");
        const firstUsages = collectCrossFileUsages(
          program,
          filename,
          getOptions([]),
          root,
          EXPORTED_FEATURE_VALUE_ELEMENT,
        );
        const initialLookups = symbolLookup.mock.calls.length;
        const initialPathLookups = relativePathLookup.mock.calls.length;
        const orphanUsages = collectCrossFileUsages(
          program,
          filename,
          getOptions([]),
          root,
          { ...EXPORTED_FEATURE_VALUE_ELEMENT, exportedName: "orphan" },
        );
        const repeatedUsages = collectCrossFileUsages(
          program,
          filename,
          getOptions([]),
          root,
          EXPORTED_FEATURE_VALUE_ELEMENT,
        );

        return {
          finalLookups: symbolLookup.mock.calls.length,
          finalPathLookups: relativePathLookup.mock.calls.length,
          firstUsages,
          initialLookups,
          initialPathLookups,
          orphanUsages,
          repeatedUsages,
        };
      },
    );

    // Assert
    expect(actualResult.initialLookups).toBeGreaterThan(0);
    expect(actualResult.initialPathLookups).toBeGreaterThan(0);
    expect(actualResult.finalLookups).toBe(actualResult.initialLookups);
    expect(actualResult.finalPathLookups).toBe(actualResult.initialPathLookups);
    expect(actualResult.firstUsages).toStrictEqual([{ isTestFile: false }]);
    expect(actualResult.repeatedUsages).toStrictEqual(actualResult.firstUsages);
    expect(actualResult.orphanUsages).toStrictEqual([]);
  });

  it("keeps test patterns, public API patterns and repository roots isolated", () => {
    // Arrange & Act
    const actualClassifications = withTemporaryProject(
      "no-unused-index-options-",
      {
        "src/api.ts": "export { feature as exposed } from './feature';",
        "src/consumer.ts": "import { feature } from './feature'; void feature;",
        "src/feature.ts": "export const feature = 1;",
      },
      (root, program, resolvePath) => {
        const filename = resolvePath("src/feature.ts");
        const states = [
          getOptions([]),
          getOptions([{ testFilePatterns: ["src/consumer.ts"] }]),
          getOptions([
            {
              publicApiFiles: ["src/api.ts"],
              testFilePatterns: ["src/consumer.ts"],
            },
          ]),
          getOptions([
            {
              publicApiFiles: ["src/api.ts"],
              testFilePatterns: ["src/consumer.ts", "src/api.ts"],
            },
          ]),
        ];
        const testConsumerState = getOptions([
          { testFilePatterns: ["src/consumer.ts"] },
        ]);
        const classifications = states.map((state) =>
          classifyExportUsage(
            collectCrossFileUsages(
              program,
              filename,
              state,
              root,
              EXPORTED_FEATURE_VALUE_ELEMENT,
            ),
          ),
        );

        return [
          ...classifications,
          classifyExportUsage(
            collectCrossFileUsages(
              program,
              filename,
              testConsumerState,
              resolvePath("src/consumer.ts"),
              EXPORTED_FEATURE_VALUE_ELEMENT,
            ),
          ),
        ];
      },
    );

    // Assert
    expect(actualClassifications).toStrictEqual([
      "production",
      "test-only",
      "production",
      "test-only",
      "production",
    ]);
  });

  it("builds a fresh index when an edited project gets a new Program", () => {
    // Arrange & Act
    const actualClassifications = withTemporaryProject(
      "no-unused-index-edit-",
      {
        "src/consumer.ts": "import { feature } from './feature'; void feature;",
        "src/feature.ts": "export const feature = 1;",
      },
      (root, program, resolvePath) => {
        const filename = resolvePath("src/feature.ts");
        const beforeEdit = classifyExportUsage(
          collectCrossFileUsages(
            program,
            filename,
            getOptions([]),
            root,
            EXPORTED_FEATURE_VALUE_ELEMENT,
          ),
        );
        writeFileSync(resolvePath("src/consumer.ts"), "export {};");
        const updatedProgram = ts.createProgram({
          oldProgram: program,
          options: program.getCompilerOptions(),
          rootNames: [...program.getRootFileNames()],
        });

        return [
          beforeEdit,
          classifyExportUsage(
            collectCrossFileUsages(
              updatedProgram,
              filename,
              getOptions([]),
              root,
              EXPORTED_FEATURE_VALUE_ELEMENT,
            ),
          ),
        ];
      },
    );

    // Assert
    expect(actualClassifications).toStrictEqual(["production", "unused"]);
  });

  it("does not count same-file references, imports, declarations or ordinary forwarding", () => {
    // Arrange & Act
    const actualUsages = withTemporaryProject(
      "no-unused-index-declarations-",
      {
        "src/barrel.ts": "export { feature as renamed } from './feature';",
        "src/consumer.ts": "import { feature } from './feature';",
        "src/feature.ts": "export const feature = 1; void feature;",
        "src/types.d.ts":
          "import { feature } from './feature'; type Shape = typeof feature;",
      },
      (root, program, resolvePath) =>
        collectCrossFileUsages(
          program,
          resolvePath("src/feature.ts"),
          getOptions([]),
          root,
          EXPORTED_FEATURE_VALUE_ELEMENT,
        ),
    );

    // Assert
    expect(actualUsages).toStrictEqual([]);
  });

  it("counts a public API exposure once even with multiple aliases", () => {
    // Arrange & Act
    const actualUsages = withTemporaryProject(
      "no-unused-index-exposure-",
      {
        "src/feature.ts": "export const feature = 1;",
        "src/index.ts":
          "export { feature, feature as renamed } from './feature';",
      },
      (root, program, resolvePath) =>
        collectCrossFileUsages(
          program,
          resolvePath("src/feature.ts"),
          getOptions([]),
          root,
          EXPORTED_FEATURE_VALUE_ELEMENT,
        ),
    );

    // Assert
    expect(actualUsages).toStrictEqual([{ isTestFile: false }]);
  });

  it("separates type and value references to the same exported symbol", () => {
    // Arrange & Act
    const actualUsages = withTemporaryProject(
      "no-unused-index-positions-",
      {
        "src/consumer.ts":
          "import { feature } from './feature'; type Shape = feature;",
        "src/feature.spec.ts":
          "import { feature } from './feature'; void feature;",
        "src/feature.ts":
          "export interface feature { id: number } export const feature = 1;",
      },
      (root, program, resolvePath) =>
        ["type", "value"].map((exportKind) =>
          collectCrossFileUsages(
            program,
            resolvePath("src/feature.ts"),
            getOptions([]),
            root,
            {
              ...EXPORTED_FEATURE_VALUE_ELEMENT,
              exportKind: exportKind === "type" ? "type" : "value",
            },
          ),
        ),
    );

    // Assert
    expect(actualUsages).toStrictEqual([
      [{ isTestFile: false }],
      [{ isTestFile: true }],
    ]);
  });
});
