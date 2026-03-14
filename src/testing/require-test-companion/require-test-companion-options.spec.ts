import { describe, expect, it } from "vitest";

import {
  getOptions,
  isLintableFilename,
  isPathMatch,
  isTypeScriptFile,
  TYPESCRIPT_EXTENSION,
} from "./require-test-companion-options";

describe("require-test-companion options", () => {
  it("normalizes defaults", () => {
    const state = getOptions([]);

    expect(state.enforceIn.length).toBeGreaterThan(0);
    expect(state.testSuffixes.length).toBeGreaterThan(0);
  });

  it("checks file types", () => {
    expect(isTypeScriptFile(`file${TYPESCRIPT_EXTENSION}`)).toBe(true);
    expect(isTypeScriptFile("file.d.ts")).toBe(false);
  });

  it("checks path patterns", () => {
    const filename = `${process.cwd()}/src/index.ts`;

    expect(isLintableFilename(filename)).toBe(true);
    expect(isPathMatch(filename, ["src/**"])).toBe(true);
  });
});
