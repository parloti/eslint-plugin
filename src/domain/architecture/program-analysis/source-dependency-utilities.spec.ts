import path from "node:path";
import * as ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import { withTemporaryProject } from "../no-unused-exports/__tests__/no-unused-exports-utilities-test-helpers";
import {
  getGlobalSourceFiles,
  getSourceDependencies,
} from "./source-dependency-utilities";

describe("shared source dependencies", () => {
  it("reuses module edges and preserves triple-slash, global, and augmentation dependencies", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "shared-source-dependencies-",
      {
        "src/augmentation.ts":
          "import './types'; declare module './types' { interface Shape { extra: number } }",
        "src/barrel.ts": "export { value } from './input';",
        "src/dynamic.ts": "export const dynamic = 1;",
        "src/entry.ts": [
          "/// <reference path='./script.ts' />",
          "/// <reference path='./missing.ts' />",
          "import { value } from './input';",
          "export { value } from './barrel';",
          "type Shape = import('./types').Shape;",
          "import Legacy = require('./legacy');",
          "const dynamic = import('./dynamic');",
          "const unresolved = require('./unresolved');",
          "const text = './not-a-module';",
        ].join("\n"),
        "src/global.ts":
          "export {}; declare global { interface GlobalExtra { value: number } }",
        "src/input.ts": "export const value = 1;",
        "src/legacy.ts": "export const legacy = 1;",
        "src/script.ts": "interface GlobalShape { value: number }",
        "src/types.ts": "export interface Shape { value: number }",
      },
      (root, program, resolvePath) => {
        const queries = vi.spyOn(
          program.getTypeChecker(),
          "getSymbolAtLocation",
        );
        const source = program.getSourceFile(resolvePath("src/entry.ts"));
        if (source === void 0) {
          throw new Error("Missing dependency fixture");
        }
        Object.defineProperty(source, "imports", { value: void 0 });
        const first = getSourceDependencies(source, program);
        const initialQueries = queries.mock.calls.length;
        const repeated = getSourceDependencies(source, program);
        const relative = (file: ts.SourceFile): string =>
          path.relative(root, file.fileName).split(path.sep).join("/");
        return {
          dependencies: first
            .map((file) => relative(file))
            .toSorted((left, right) => left.localeCompare(right)),
          globals: getGlobalSourceFiles(program)
            .filter(
              (file) => !path.relative(root, file.fileName).startsWith(".."),
            )
            .map((file) => relative(file))
            .toSorted((left, right) => left.localeCompare(right)),
          initialQueries,
          repeatedQueries: queries.mock.calls.length - initialQueries,
          reusedEdges: repeated === first,
        };
      },
    );

    // Assert
    expect(actual.initialQueries).toBeGreaterThan(0);
    expect(actual.dependencies).toStrictEqual([
      "src/augmentation.ts",
      "src/barrel.ts",
      "src/dynamic.ts",
      "src/input.ts",
      "src/legacy.ts",
      "src/script.ts",
      "src/types.ts",
    ]);
    expect(actual.globals).toStrictEqual([
      "src/augmentation.ts",
      "src/global.ts",
      "src/script.ts",
    ]);
    expect(actual.repeatedQueries).toBe(0);
    expect(actual.reusedEdges).toBe(true);
  });
});
