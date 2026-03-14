import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { BarrelFilesExportsOnlyOptions } from "./types";

import {
  createTemporaryRunner,
  runRule,
} from "./exports-only-rule-test-utilities";
import {
  createBody,
  createExportAll,
  createExportNamedFrom,
  createExportWithDeclaration,
  createExportWithoutSource,
  createImportDeclaration,
} from "./test-helpers";

describe("barrel files exports-only rule (enforced)", () => {
  const temporaryDirectories: string[] = [];
  const allowAllFolders: BarrelFilesExportsOnlyOptions = { folders: ["**"] };
  const { runDefaultIndex, runTemporaryIndex } =
    createTemporaryRunner(temporaryDirectories);

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it("allows empty barrel files", () => {
    const reports = runTemporaryIndex(createBody(), allowAllFolders);

    expect(reports).toStrictEqual([]);
  });

  it("uses default options for barrel detection", () => {
    const reports = runDefaultIndex(createBody(createImportDeclaration()));

    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("invalidBarrelContent");
  });

  it("accepts string names for barrel detection", () => {
    const options: BarrelFilesExportsOnlyOptions = {
      folders: ["tmp/**"],
      names: "index.ts",
    };
    const reports = runTemporaryIndex(
      createBody(createImportDeclaration()),
      options,
    );

    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("invalidBarrelContent");
  });

  it("allows re-export statements", () => {
    const reports = runTemporaryIndex(
      createBody(createExportAll(), createExportNamedFrom()),
      allowAllFolders,
    );

    expect(reports).toStrictEqual([]);
  });

  it.each([
    ["import declarations", createBody(createImportDeclaration())],
    ["exported declarations", createBody(createExportWithDeclaration())],
    ["exports without sources", createBody(createExportWithoutSource())],
  ])("reports on %s", (_label, body) => {
    const reports = runTemporaryIndex(body, allowAllFolders);

    expect(reports).toHaveLength(1);
    expect(reports[0]?.messageId).toBe("invalidBarrelContent");
  });
});

describe("barrel files exports-only rule (skips)", () => {
  const temporaryDirectories: string[] = [];
  const allowAllFolders: BarrelFilesExportsOnlyOptions = { folders: ["**"] };
  const { runTemporaryFeature, runTemporaryIndex } =
    createTemporaryRunner(temporaryDirectories);

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it("skips non-barrel files", () => {
    const reports = runTemporaryFeature(
      createBody(createImportDeclaration()),
      allowAllFolders,
    );

    expect(reports).toStrictEqual([]);
  });

  it.each([["names are empty", { folders: ["tmp/**"], names: "   " }]])(
    "skips when %s",
    (_label, options) => {
      const reports = runTemporaryIndex(
        createBody(createImportDeclaration()),
        options,
      );

      expect(reports).toStrictEqual([]);
    },
  );

  it("skips when folders are blank", () => {
    const reports = runTemporaryIndex(createBody(createImportDeclaration()), {
      folders: "   ",
      names: ["index.ts"],
    });

    expect(reports).toStrictEqual([]);
  });

  it("skips when filename is not absolute", () => {
    const reports = runRule(
      "relative/index.ts",
      createBody(createImportDeclaration()),
      allowAllFolders,
    );

    expect(reports).toStrictEqual([]);
  });

  it("skips when file is outside the repo", () => {
    const filePath = path.resolve(process.cwd(), "..", "outside", "index.ts");
    const reports = runRule(
      filePath,
      createBody(createImportDeclaration()),
      allowAllFolders,
    );

    expect(reports).toStrictEqual([]);
  });
});
