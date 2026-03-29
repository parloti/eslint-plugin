import { rmSync } from "node:fs";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

import {
  createTemporaryRunner,
  runRule,
} from "./no-reexports-outside-barrels-test-utilities";
import { createBody } from "./test-helpers";

describe("no-reexports test utilities", () => {
  it("runs the rule with an empty program", (): void => {
    // Arrange
    const filePath = `${cwd()}/src/feature.ts`;
    const body = createBody();

    // Act
    const reports = runRule(filePath, body);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("creates temporary runners", (): void => {
    // Arrange
    const temporaryDirectories: string[] = [];
    const runner = createTemporaryRunner(temporaryDirectories);
    const body = createBody();

    // Act
    const reports = ((): ReturnType<typeof runRule>[] => {
      try {
        return [
          runner.runDefaultFeature(body),
          runner.runTemporaryFeature(body),
          runner.runTemporaryIndex(body),
        ];
      } finally {
        for (const directory of temporaryDirectories.splice(0)) {
          rmSync(directory, { force: true, recursive: true });
        }
      }
    })();

    // Assert
    expect(reports.flat()).toStrictEqual([]);
  });
});
