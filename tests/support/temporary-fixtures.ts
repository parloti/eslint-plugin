import fs from "node:fs";
import path from "node:path";

interface FixtureSet {
  directory: string;
  filePaths: Record<string, string>;
  folderGlob: string;
  folderGlobs: string[];
  getFilePath: (relativePath: string) => string;
}

interface TemporaryFixtureManager {
  cleanupTemporaryDirectories: () => void;
  createFixtureSet: (
    files: Record<string, string>,
    root?: "src" | "tmp",
  ) => FixtureSet;
}

const toPosixPath = (filePath: string): string =>
  filePath.split(path.sep).join("/");

const createTemporaryFixtureManager = (): TemporaryFixtureManager => {
  const temporaryDirectories: string[] = [];

  const createFixtureSet = (
    files: Record<string, string>,
    root: "src" | "tmp" = "tmp",
  ): FixtureSet => {
    const baseDirectory = path.join(process.cwd(), root);
    fs.mkdirSync(baseDirectory, { recursive: true });

    const directory = fs.mkdtempSync(path.join(baseDirectory, "e2e-"));
    temporaryDirectories.push(directory);

    const filePaths = Object.fromEntries(
      Object.entries(files).map(([relativePath, content]) => {
        const filePath = path.join(directory, relativePath);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, "utf8");
        return [relativePath, filePath];
      }),
    );

    const folderGlob = `${toPosixPath(path.relative(process.cwd(), directory))}/**`;
    const getFilePath = (relativePath: string): string => {
      const filePath = filePaths[relativePath];

      if (filePath === void 0) {
        throw new Error(`Missing fixture file path for ${relativePath}.`);
      }

      return filePath;
    };

    return {
      directory,
      filePaths,
      folderGlob,
      folderGlobs: [folderGlob],
      getFilePath,
    };
  };

  const cleanupTemporaryDirectories = (): void => {
    for (const directory of temporaryDirectories.splice(0)) {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  };

  return { cleanupTemporaryDirectories, createFixtureSet };
};

export { createTemporaryFixtureManager };
export type { FixtureSet };
