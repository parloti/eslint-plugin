import fs from "node:fs";
import { describe, expect, it } from "vitest";

import {
  createTemporaryRunner,
  runRule,
} from "./exports-only-rule-test-utilities";
import { createBody } from "./test-helpers";

describe("exports-only rule test utilities", () => {
  it("runs the rule with an empty program", () => {
    const reports = runRule(`${process.cwd()}/src/index.ts`, createBody(), {
      folders: ["**"],
    });

    expect(reports).toStrictEqual([]);
  });

  it("creates temporary runners", () => {
    const temporaryDirectories: string[] = [];
    const runner = createTemporaryRunner(temporaryDirectories);
    const body = createBody();

    const reports = [
      runner.runDefaultIndex(body),
      runner.runTemporaryIndex(body),
      runner.runTemporaryIndex(body, { folders: ["tmp/**"] }),
      runner.runTemporaryFeature(body),
      runner.runTemporaryFeature(body, { folders: ["tmp/**"] }),
    ];

    for (const directory of temporaryDirectories.splice(0)) {
      fs.rmSync(directory, { force: true, recursive: true });
    }

    expect(reports.flat()).toStrictEqual([]);
  });
});
