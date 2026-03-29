import type { AST } from "eslint";

import path from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

import {
  collectImportedNames,
  getOptions,
  hasImportedExport,
  isBarrelFile,
  shouldLintFile,
} from "./no-reexports-outside-barrels-utilities";

/** Stores the collected import names and re-export result for a test case. */
interface ImportExportResult {
  /** Whether the export statement re-exports an imported name. */
  hasReexportedImport: boolean;
  /** Imported names collected from the test program body. */
  importedNames: Set<string>;
}

describe("no-reexports utilities", () => {
  it("normalizes options and checks barrels", (): void => {
    // Arrange
    const state = getOptions([{ allowedBarrelNames: ["index"] }]);
    const barrel = `${cwd()}/src/index.ts`;
    const featurePath = `${cwd()}/src/feature.ts`;

    // Act
    const result = {
      barrelDetected: isBarrelFile(barrel, state),
      featureShouldLint: shouldLintFile(featurePath, state),
    };

    // Assert
    expect(result.barrelDetected).toBe(true);
    expect(result.featureShouldLint).toBe(true);
  });

  it("collects imports and detects export usage", (): void => {
    // Arrange
    const body = [
      {
        specifiers: [{ local: { name: "feature" } }],
        type: "ImportDeclaration",
      },
      {
        declaration: void 0,
        source: void 0,
        specifiers: [{ local: { name: "feature", type: "Identifier" } }],
        type: "ExportNamedDeclaration",
      },
    ] as [AST.Program["body"][number], AST.Program["body"][number]];
    const [, exportStatement] = body;

    // Act
    const result = ((): ImportExportResult => {
      const importedNames = collectImportedNames(body);

      return {
        hasReexportedImport: hasImportedExport(exportStatement, importedNames),
        importedNames,
      };
    })();

    // Assert
    expect(result.importedNames.has("feature")).toBe(true);
    expect(result.hasReexportedImport).toBe(true);
  });

  it("skips non-lintable paths", (): void => {
    // Arrange
    const state = getOptions([{ allowedBarrelNames: ["index"] }]);
    const outside = path.resolve(cwd(), "..", "outside.ts");

    // Act
    const result = {
      outsideShouldLint: shouldLintFile(outside, state),
      relativeShouldLint: shouldLintFile("relative.ts", state),
    };

    // Assert
    expect(result.relativeShouldLint).toBe(false);
    expect(result.outsideShouldLint).toBe(false);
  });

  it("supports custom barrel stems", (): void => {
    // Arrange
    const state = getOptions([{ allowedBarrelNames: ["mod"] }]);

    // Act
    const result = {
      barrelDetected: isBarrelFile(`${cwd()}/src/mod.ts`, state),
      featureShouldLint: shouldLintFile(`${cwd()}/src/feature.ts`, state),
    };

    // Assert
    expect(result.barrelDetected).toBe(true);
    expect(result.featureShouldLint).toBe(true);
  });

  describe.runIf(path.sep === "\\")("windows paths", (): void => {
    it("skips files on another root", (): void => {
      // Arrange
      const { root } = path.parse(cwd());
      const driveLetter = root[0]?.toUpperCase() ?? "C";
      const otherDrive = driveLetter === "C" ? "Z" : "C";
      const state = getOptions([{ allowedBarrelNames: ["index"] }]);

      // Act
      const shouldLint = ((): boolean => {
        const foreignPath = path.win32.join(`${otherDrive}:`, "outside.ts");

        return shouldLintFile(foreignPath, state);
      })();

      // Assert
      expect(shouldLint).toBe(false);
    });
  });
});
