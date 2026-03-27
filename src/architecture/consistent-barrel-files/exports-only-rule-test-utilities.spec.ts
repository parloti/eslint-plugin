import fs from "node:fs";
import { describe, expect, it } from "vitest";

import {
  createTemporaryRunner,
  runRule,
} from "./exports-only-rule-test-utilities";
import { createBody } from "./test-helpers";

describe("exports-only rule test utilities", () => {
  it("runs the rule with an empty program", () => {
    // Arrange
    const filePath = `${process.cwd()}/src/index.ts`;
    const body = createBody();

    // Act
    const reports = runRule(filePath, body);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("creates temporary runners", () => {
    // Arrange
    const temporaryDirectories: string[] = [];
    const runner = createTemporaryRunner(temporaryDirectories);
    const body = createBody();

    // Act
    const reports = (() => {
      try {
        return [
          runner.runDefaultIndex(body),
          runner.runTemporaryBarrel("mod.ts", body, [
            { allowedBarrelNames: ["mod"] },
          ]),
          runner.runTemporaryIndex(body),
          runner.runTemporaryFeature(body),
        ];
      } finally {
        for (const directory of temporaryDirectories.splice(0)) {
          fs.rmSync(directory, { force: true, recursive: true });
        }
      }
    })();

    // Assert
    expect(reports.flat()).toStrictEqual([]);
  });
});
