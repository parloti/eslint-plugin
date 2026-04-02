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
    // Arrange
    const directoryName = "tmp";
    const fileName = "feature.ts";

    // Act
    const filePath = createTemporaryFile(directoryName, fileName);

    // Assert
    expect(filePath).toContain("feature.ts");
  });

  it("creates temporary file pairs", () => {
    // Arrange
    const [sourcePath, testPath] = createTemporaryPair(
      "tmp",
      "feature.ts",
      "feature.spec.ts",
    );

    // Act
    const result = {
      sourcePath,
      testPath,
    };

    // Assert
    expect(result.sourcePath).toContain("feature.ts");
    expect(result.testPath).toContain("feature.spec.ts");
  });

  it("runs rule helpers", () => {
    // Arrange
    const filePath = "relative.ts";
    const options = { enforceIn: ["**"] };

    // Act
    const reports = runRule(filePath, options);

    // Assert
    expect(reports).toStrictEqual([]);
  });

  it("runs rule helpers with defaults", () => {
    // Arrange
    const filePath = "relative.ts";

    // Act
    const reports = runRule(filePath);

    // Assert
    expect(reports).toStrictEqual([]);
  });
});
