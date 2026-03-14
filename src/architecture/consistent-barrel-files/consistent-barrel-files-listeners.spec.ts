import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import { buildListenerForFile } from "./consistent-barrel-files-listeners";
import { getOptions } from "./consistent-barrel-files-options";

describe("consistent-barrel-files listeners", () => {
  it("returns no-op listener when folders are empty", () => {
    const state = getOptions([{ folders: [] }]);
    const listener = buildListenerForFile(
      {} as Rule.RuleContext,
      `${process.cwd()}/src/index.ts`,
      state,
    );

    expect(listener).toStrictEqual({});
  });
});
