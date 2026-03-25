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
    const options = {
      folders: ["**"],
    };

    // Act
    const reports = runRule(filePath, body, options);

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
          runner.runTemporaryIndex(body),
          runner.runTemporaryIndex(body, { folders: ["tmp/**"] }),
          runner.runTemporaryFeature(body),
          runner.runTemporaryFeature(body, { folders: ["tmp/**"] }),
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
