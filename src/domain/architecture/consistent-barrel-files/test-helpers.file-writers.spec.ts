import { readFileSync, rmSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import { createRepoDirectory } from "./test-helpers";
import { writeBarrel, writeFeature } from "./test-helpers.file-writers";

describe("test helper file writers", (): void => {
  const temporaryDirectories: string[] = [];

  afterEach((): void => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("writes the expected barrel fixture", (): void => {
    // Arrange
    const directory = createRepoDirectory("tmp");
    temporaryDirectories.push(directory);
    const filePath = `${directory}/index.ts`;

    // Act
    const contents = ((): string => {
      writeBarrel(filePath);

      return readFileSync(filePath, "utf8");
    })();

    // Assert
    expect(contents).toBe("export * from './feature';");
  });

  it("writes the expected feature fixture", (): void => {
    // Arrange
    const directory = createRepoDirectory("tmp");
    temporaryDirectories.push(directory);
    const filePath = `${directory}/feature.ts`;

    // Act
    const contents = ((): string => {
      writeFeature(filePath);

      return readFileSync(filePath, "utf8");
    })();

    // Assert
    expect(contents).toBe("export const feature = 1;");
  });
});
