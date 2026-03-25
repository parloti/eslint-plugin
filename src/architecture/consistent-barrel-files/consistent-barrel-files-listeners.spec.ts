import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import { buildListenerForFile } from "./consistent-barrel-files-listeners";
import { getOptions } from "./consistent-barrel-files-options";

describe("consistent-barrel-files listeners", () => {
  it("returns no-op listener when folders are empty", () => {
    // Arrange
    const options = [{ folders: [] }];

    // Act
    const listener = (() => {
      const state = getOptions(options);

      return buildListenerForFile(
        {} as Rule.RuleContext,
        `${process.cwd()}/src/index.ts`,
        state,
      );
    })();

    // Assert
    expect(listener).toStrictEqual({});
  });
});
