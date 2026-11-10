import { describe, expect, it } from "vitest";

import { withTemporaryProject } from "./no-unused-exports-utilities-test-helpers";

describe("no-unused-exports utilities test helpers", () => {
  it("rejects paths that were not written into the fixture project", () => {
    // Arrange
    let actualError: unknown;

    // Act
    withTemporaryProject(
      "no-unused-exports-unknown-path-",
      { "src/entry.ts": "export {};\n" },
      (_temporaryRoot, _program, resolvePath) => {
        try {
          resolvePath("src/missing.ts");
        } catch (error) {
          actualError = error;
        }
      },
    );

    // Assert
    expect(actualError).toStrictEqual(
      new Error("Unknown fixture path: src/missing.ts"),
    );
  });
});
