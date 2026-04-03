import { rmSync } from "node:fs";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

import {
  createTemporaryRunner,
  runRule,
} from "./exports-only-rule-test-utilities";
import { createBody } from "./test-helpers";

describe("exports-only rule test utilities", () => {
  it("runs the rule with an empty program", (): void => {
    // Arrange
    const filePath = `${cwd()}/src/index.ts`;
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
    const expectedReports: ReturnType<typeof runRule> = [];

    // Act
    const actualReports = ((): ReturnType<typeof runRule> => {
      try {
        return [
          runner.runDefaultIndex(body),
          runner.runTemporaryBarrel("mod.ts", body, [
            { allowedBarrelNames: ["mod"] },
          ]),
          runner.runTemporaryIndex(body),
          runner.runTemporaryFeature(body),
        ].flat();
      } finally {
        for (const directory of temporaryDirectories.splice(0)) {
          rmSync(directory, { force: true, recursive: true });
        }
      }
    })();

    // Assert
    expect(actualReports).toStrictEqual(expectedReports);
  });
});
