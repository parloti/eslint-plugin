import { afterEach, describe, expect, it } from "vitest";

import {
  cleanupTemporaryDirectories,
  createTemporaryFile,
  createTemporaryPair,
  runRule,
} from "./require-test-companion-test-helpers";

describe("require-test-companion test helpers", () => {
  afterEach(() => {
    cleanupTemporaryDirectories();
  });

  it("creates temporary files", () => {
    const filePath = createTemporaryFile("tmp", "feature.ts");

    expect(filePath).toContain("feature.ts");
  });

  it("creates temporary file pairs", () => {
    const [sourcePath, testPath] = createTemporaryPair(
      "tmp",
      "feature.ts",
      "feature.spec.ts",
    );

    expect(sourcePath).toContain("feature.ts");
    expect(testPath).toContain("feature.spec.ts");
  });

  it("runs rule helpers", () => {
    const reports = runRule("relative.ts", { enforceIn: ["**"] });

    expect(reports).toStrictEqual([]);
  });

  it("runs rule helpers with defaults", () => {
    const reports = runRule("relative.ts");

    expect(reports).toStrictEqual([]);
  });
});
