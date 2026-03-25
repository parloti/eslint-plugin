import type { AST } from "eslint";

import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  collectImportedNames,
  getOptions,
  hasImportedExport,
  isBarrelFile,
  shouldLintFile,
} from "./no-reexports-outside-barrels-utilities";

describe("no-reexports utilities", () => {
  it("normalizes options and checks barrels", () => {
    // Arrange
    const state = getOptions([{ folders: ["src/**"], names: ["index.ts"] }]);
    const barrel = `${process.cwd()}/src/index.ts`;
    const featurePath = `${process.cwd()}/src/feature.ts`;

    // Act
    const result = {
      barrelDetected: isBarrelFile(barrel, state),
      featureShouldLint: shouldLintFile(featurePath, state),
    };

    // Assert
    expect(result.barrelDetected).toBe(true);
    expect(result.featureShouldLint).toBe(true);
  });

  it("collects imports and detects export usage", () => {
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
    const result = (() => {
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

  it("skips non-lintable paths", () => {
    // Arrange
    const state = getOptions([{ folders: ["src/**"], names: ["index.ts"] }]);
    const outside = path.resolve(process.cwd(), "..", "outside.ts");

    // Act
    const result = {
      outsideShouldLint: shouldLintFile(outside, state),
      relativeShouldLint: shouldLintFile("relative.ts", state),
    };

    // Assert
    expect(result.relativeShouldLint).toBe(false);
    expect(result.outsideShouldLint).toBe(false);
  });

  it("skips when options are empty", () => {
    // Arrange
    const state = getOptions([{ folders: [], names: [] }]);

    // Act
    const featureShouldLint = shouldLintFile(
      `${process.cwd()}/src/feature.ts`,
      state,
    );

    // Assert
    expect(featureShouldLint).toBe(false);
  });

  describe.runIf(path.sep === "\\")("windows paths", () => {
    it("skips files on another root", () => {
      // Arrange
      const { root } = path.parse(process.cwd());
      const driveLetter = root[0]?.toUpperCase() ?? "C";
      const otherDrive = driveLetter === "C" ? "Z" : "C";
      const state = getOptions([{ folders: ["src/**"], names: ["index.ts"] }]);

      // Act
      const shouldLint = (() => {
        const foreignPath = path.win32.join(`${otherDrive}:`, "outside.ts");

        return shouldLintFile(foreignPath, state);
      })();

      // Assert
      expect(shouldLint).toBe(false);
    });
  });
});
