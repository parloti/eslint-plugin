import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  createPackageJson,
  matchPackageImport,
  withTemporaryFiles,
} from "./__tests__/package-subpath-import-test-helpers";
import { createPackageSubpathImportMatcher } from "./package-subpath-import-utilities";

describe("package subpath import matcher", () => {
  it("matches exact and wildcard aliases from the owning package", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({
        "#config": "./src/config.json",
        "#internal/*": "./src/internal/*",
      }),
    };

    // Act
    const actual = {
      exact: matchPackageImport(
        files,
        "src/features/consumer.ts",
        "../config.json",
      ),
      unmatched: matchPackageImport(
        files,
        "src/features/consumer.ts",
        "./sibling",
      ),
      wildcard: matchPackageImport(
        files,
        "src/features/consumer.ts",
        "../internal/util",
      ),
    };

    // Assert
    expect(actual.exact).toBe("#config");
    expect(actual.wildcard).toBe("#internal/util");
    expect(actual.unmatched).toBeUndefined();
  });

  it("preserves query suffixes when rewriting to an alias", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({ "#assets/*": "./src/assets/*" }),
    };

    // Act
    const actual = matchPackageImport(
      files,
      "src/feature.ts",
      "./assets/logo.svg?url",
    );

    // Assert
    expect(actual).toBe("#assets/logo.svg?url");
  });

  it("prefers the most specific alias when several can represent a path", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({
        "#*": "./src/*",
        "#src/*": "./src/*",
      }),
    };

    // Act
    const actual = matchPackageImport(
      files,
      "src/features/consumer.ts",
      "../feature",
    );

    // Assert
    expect(actual).toBe("#src/feature");
  });

  it("uses the nearest workspace package.json in a monorepo", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({ "#root/*": "./src/*" }),
      "packages/app/package.json": createPackageJson({ "#app/*": "./src/*" }),
    };

    // Act
    const actual = withTemporaryFiles(files, (temporaryRoot) => {
      const appMatch = createPackageSubpathImportMatcher(
        path.join(temporaryRoot, "packages/app/src/features/feature.ts"),
        temporaryRoot,
      );
      const rootMatch = createPackageSubpathImportMatcher(
        path.join(temporaryRoot, "src/features/root.ts"),
        temporaryRoot,
      );

      return { app: appMatch("../util"), root: rootMatch("../util") };
    });

    // Assert
    expect(actual.app).toBe("#app/util");
    expect(actual.root).toBe("#root/util");
  });

  it("does not fall back to root aliases when the workspace package has no imports", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({ "#root/*": "./src/*" }),
      "packages/app/package.json": '{"name":"app"}',
    };

    // Act
    const actual = matchPackageImport(
      files,
      "packages/app/src/feature.ts",
      "./util",
    );

    // Assert
    expect(actual).toBeUndefined();
  });

  it("does not match relative paths outside the owning package", () => {
    // Arrange
    const files = {
      "packages/app/package.json": createPackageJson({ "#app/*": "./src/*" }),
    };

    // Act
    const actual = matchPackageImport(
      files,
      "packages/app/src/feature.ts",
      "../../../shared/util",
    );

    // Assert
    expect(actual).toBeUndefined();
  });

  it("accepts conditional aliases only when every branch resolves to the same target", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({
        "#same": { default: "./src/config.js", node: "./src/config.js" },
      }),
    };

    // Act
    const actual = matchPackageImport(files, "src/feature.ts", "./config.js");

    // Assert
    expect(actual).toBe("#same");
  });

  it("ignores aliases with null or mixed conditional branches", () => {
    // Arrange
    const nullBranchFiles = {
      "package.json":
        '{"imports":{"#blocked":{"default":null,"node":"./src/config.js"}}}',
    };
    const mixedBranchFiles = {
      "package.json": createPackageJson({
        "#mixed": { default: "./src/config.js", node: "./src/config.node.js" },
      }),
    };

    // Act
    const actual = {
      mixedBranch: matchPackageImport(
        mixedBranchFiles,
        "src/feature.ts",
        "./config.js",
      ),
      nullBranch: matchPackageImport(
        nullBranchFiles,
        "src/feature.ts",
        "./config.js",
      ),
    };

    // Assert
    expect(actual.nullBranch).toBeUndefined();
    expect(actual.mixedBranch).toBeUndefined();
  });

  it.each([
    { imports: { "#external": "dependency" } },
    { imports: { "#escape": "./../outside.js" } },
    { imports: { "#empty": "./" } },
    { imports: { "#two**": "./src/**" } },
    { imports: { "#mismatch*": "./src/config.js" } },
    { imports: { "relative/*": "./src/*" } },
  ])("ignores unsupported import declarations: $imports", ({ imports }) => {
    // Arrange
    const files = { "package.json": createPackageJson(imports) };

    // Act
    const actual = matchPackageImport(files, "src/feature.ts", "./config.js");

    // Assert
    expect(actual).toBeUndefined();
  });

  it("supports pattern targets with suffixes", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({ "#ts/*": "./src/*.ts" }),
    };

    // Act
    const actual = matchPackageImport(
      files,
      "src/features/consumer.ts",
      "../feature.ts",
    );

    // Assert
    expect(actual).toBe("#ts/feature");
  });

  it("normalizes Windows separators in package targets", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({ "#src/*": "./src\\*" }),
    };

    // Act
    const actual = matchPackageImport(
      files,
      "src/features/consumer.ts",
      "../feature",
    );

    // Assert
    expect(actual).toBe("#src/feature");
  });

  it.each([
    { packageJson: "{ invalid json" },
    { packageJson: JSON.stringify({ imports: "invalid" }) },
    { packageJson: JSON.stringify({ name: "no-imports" }) },
  ])("returns no aliases for unusable package metadata", ({ packageJson }) => {
    // Arrange
    const files = { "package.json": packageJson };

    // Act
    const actual = matchPackageImport(files, "src/feature.ts", "./feature");

    // Assert
    expect(actual).toBeUndefined();
  });

  it("returns no alias when no package.json exists", () => {
    // Act
    const actual = matchPackageImport({}, "src/feature.ts", "./feature");

    // Assert
    expect(actual).toBeUndefined();
  });

  it("ignores non-relative and already-aliased specifiers", () => {
    // Arrange
    const files = {
      "package.json": createPackageJson({ "#src/*": "./src/*" }),
    };

    // Act
    const actual = withTemporaryFiles(files, (temporaryRoot) => {
      const matchAlias = createPackageSubpathImportMatcher(
        path.join(temporaryRoot, "src/feature.ts"),
        temporaryRoot,
      );

      return [
        matchAlias("node:fs"),
        matchAlias("package"),
        matchAlias("#src/other"),
      ];
    });

    // Assert
    expect(actual).toStrictEqual([void 0, void 0, void 0]);
  });
});
