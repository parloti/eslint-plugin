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
    const state = getOptions([{ folders: ["src/**"], names: ["index.ts"] }]);
    const barrel = `${process.cwd()}/src/index.ts`;

    expect(isBarrelFile(barrel, state)).toBe(true);
    expect(shouldLintFile(`${process.cwd()}/src/feature.ts`, state)).toBe(true);
  });

  it("collects imports and detects export usage", () => {
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
    const importedNames = collectImportedNames(body);
    const [, exportStatement] = body;

    expect(importedNames.has("feature")).toBe(true);
    expect(hasImportedExport(exportStatement, importedNames)).toBe(true);
  });

  it("skips non-lintable paths", () => {
    const state = getOptions([{ folders: ["src/**"], names: ["index.ts"] }]);

    expect(shouldLintFile("relative.ts", state)).toBe(false);

    const outside = path.resolve(process.cwd(), "..", "outside.ts");

    expect(shouldLintFile(outside, state)).toBe(false);
  });

  it("skips when options are empty", () => {
    const state = getOptions([{ folders: [], names: [] }]);

    expect(shouldLintFile(`${process.cwd()}/src/feature.ts`, state)).toBe(
      false,
    );
  });

  describe.runIf(path.sep === "\\")("windows paths", () => {
    it("skips files on another root", () => {
      const { root } = path.parse(process.cwd());
      const driveLetter = root[0]?.toUpperCase() ?? "C";
      const otherDrive = driveLetter === "C" ? "Z" : "C";
      const foreignPath = path.win32.join(`${otherDrive}:`, "outside.ts");
      const state = getOptions([{ folders: ["src/**"], names: ["index.ts"] }]);

      expect(shouldLintFile(foreignPath, state)).toBe(false);
    });
  });
});
