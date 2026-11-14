import path from "node:path";
import { describe, expect, it } from "vitest";

import { withTemporaryFiles } from "./__tests__/package-subpath-import-test-helpers";
import { findCandidatePackagePath } from "./package-subpath-import-path-utilities";

describe("package import path utilities", () => {
  it("finds a matching extension file using the filesystem probe", () => {
    // Arrange
    const files = { "src/module.ts": "export {};" };

    // Act
    const actual = withTemporaryFiles(files, (temporaryRoot) =>
      findCandidatePackagePath(
        path.join(temporaryRoot, "src/module"),
        "src/module",
        (candidate) => candidate === "src/module.ts",
      ),
    );

    // Assert
    expect(actual).toBe("src/module.ts");
  });

  it("finds an index file when no direct candidate matches", () => {
    // Arrange
    const files = { "src/module/index.ts": "export {};" };

    // Act
    const actual = withTemporaryFiles(files, (temporaryRoot) =>
      findCandidatePackagePath(
        path.join(temporaryRoot, "src/module"),
        "src/module",
        (candidate) => candidate === "src/module/index.ts",
      ),
    );

    // Assert
    expect(actual).toBe("src/module/index.ts");
  });

  it("returns undefined when no relevant candidate exists on disk", () => {
    // Act
    const actual = withTemporaryFiles({}, (temporaryRoot) =>
      findCandidatePackagePath(
        path.join(temporaryRoot, "src/missing"),
        "src/missing",
        () => true,
      ),
    );

    // Assert
    expect(actual).toBeUndefined();
  });
});
