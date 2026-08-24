import path from "node:path";
import { describe, expect, it } from "vitest";

import { EXPORTED_FEATURE_VALUE_ELEMENT } from "./__tests__/no-unused-exports-usage-fixture-helpers";
import { withTemporaryProject } from "./__tests__/no-unused-exports-utilities-test-helpers";
import { getOptions } from "./no-unused-exports-options";
import { collectCrossFileUsages } from "./no-unused-exports-usage-utilities";

/** Relative file contents composing the single-source fixture project. */
const SINGLE_SOURCE_FIXTURE_FILES = {
  "src/feature.ts": "export const feature = 1;\n",
};

/** Relative file contents composing the script-only fixture project. */
const SCRIPT_ONLY_FIXTURE_FILES = {
  "src/script.ts": "const scriptOnly = 1;\nscriptOnly;\n",
};

describe("no-unused-exports symbol resolution", () => {
  it("returns no usages when the export symbol cannot be resolved", () => {
    // Arrange
    const options = getOptions([]);

    // Act
    const actualUsages = withTemporaryProject(
      "no-unused-missing-",
      SINGLE_SOURCE_FIXTURE_FILES,
      (temporaryRoot, program, resolvePath) =>
        collectCrossFileUsages(
          program,
          resolvePath("src/feature.ts"),
          options,
          temporaryRoot,
          {
            exportedName: "missing",
            exportKind: "value",
            node: { type: "ExportNamedDeclaration" } as never,
          },
        ),
    );

    // Assert
    expect(actualUsages).toStrictEqual([]);
  });

  it("returns no usages when the source filename is missing from the program", () => {
    // Arrange
    const missingFilename = "missing.ts";

    // Act
    const actualUsages = withTemporaryProject(
      "no-unused-missing-file-",
      SINGLE_SOURCE_FIXTURE_FILES,
      (temporaryRoot, program) => {
        const missingPath = path.join(temporaryRoot, "src", missingFilename);

        return collectCrossFileUsages(
          program,
          missingPath,
          getOptions([]),
          temporaryRoot,
          EXPORTED_FEATURE_VALUE_ELEMENT,
        );
      },
    );

    // Assert
    expect(actualUsages).toStrictEqual([]);
  });

  it("returns no usages for source files without a module symbol", () => {
    // Arrange & Act
    const actualUsages = withTemporaryProject(
      "no-unused-script-",
      SCRIPT_ONLY_FIXTURE_FILES,
      (temporaryRoot, program, resolvePath) =>
        collectCrossFileUsages(
          program,
          resolvePath("src/script.ts"),
          getOptions([]),
          temporaryRoot,
          {
            exportedName: "missing",
            exportKind: "value",
            node: { type: "ExportNamedDeclaration" } as never,
          },
        ),
    );

    // Assert
    expect(actualUsages).toStrictEqual([]);
  });
});
