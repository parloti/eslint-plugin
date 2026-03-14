import { describe, expect, it } from "vitest";

import {
  getOptions,
  isLintableFilename,
  shouldLintFile,
} from "./consistent-barrel-files-options";

describe("consistent-barrel-files options", () => {
  it("builds default options", () => {
    const state = getOptions([]);

    expect(state.folders.length).toBeGreaterThan(0);
    expect(state.names.length).toBeGreaterThan(0);
  });

  it("checks lintable filenames", () => {
    expect(isLintableFilename("")).toBe(false);
    expect(isLintableFilename(`${process.cwd()}/src/index.ts`)).toBe(true);
  });

  it("verifies folder matching for linting", () => {
    const state = getOptions([]);
    const filename = `${process.cwd()}/src/index.ts`;

    expect(shouldLintFile(filename, state.folders, state.names)).toBe(true);
  });
});
