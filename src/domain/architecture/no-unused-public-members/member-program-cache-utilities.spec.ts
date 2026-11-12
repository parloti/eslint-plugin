import { execFileSync } from "node:child_process";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  getMemberProgramCache,
  setMemberProgramCache,
} from "./member-program-cache-utilities";

const cacheModuleUrl = new URL(
  "member-program-cache-utilities.ts",
  import.meta.url,
).href;
const collectReferences = [
  "let released = false;",
  "for (let attempt = 0; attempt < 20; attempt++) {",
  "  await new Promise(resolve => setImmediate(resolve));",
  "  globalThis.gc();",
  "  released = references.every(reference => reference.deref() === undefined);",
  "  if (released) break;",
  "}",
  "console.log(JSON.stringify({ released }));",
];
const retentionProbe = [
  `import { setMemberProgramCache } from ${JSON.stringify(cacheModuleUrl)};`,
  "import ts from 'typescript';",
  "function populate() {",
  "  const program = ts.createProgram([], { noLib: true });",
  "  const value = { program, checker: program.getTypeChecker() };",
  "  setMemberProgramCache(program, 'cycle', 'options', value);",
  "  return [new WeakRef(program), new WeakRef(value)];",
  "}",
  "const references = populate();",
  ...collectReferences,
].join("\n");
const scopeRetentionProbe = [
  "import assert from 'node:assert/strict';",
  "import { fileURLToPath } from 'node:url';",
  "import ts from 'typescript';",
  "import { createJiti } from 'jiti';",
  `const jiti = createJiti(${JSON.stringify(import.meta.url)}, { fsCache: false });`,
  `const base = ${JSON.stringify(import.meta.url)};`,
  "const { getProductionUsageIndex } = await jiti.import(fileURLToPath(new URL('./member-usage-index-utilities.ts', base)));",
  "const { getOptions } = await jiti.import(fileURLToPath(new URL('../no-unused-exports/no-unused-exports-options.ts', base)));",
  "const program = ts.createProgram([], { noLib: true });",
  "const state = getOptions([]);",
  "function replaceScope() {",
  "  const scope = { root: 'first', apiFiles: [], sourceFiles: new Set() };",
  "  const index = getProductionUsageIndex(program, state, process.cwd(), scope);",
  "  const reference = new WeakRef(index);",
  "  getProductionUsageIndex(program, state, process.cwd(), { root: 'next', apiFiles: [], sourceFiles: new Set() });",
  "  return [reference];",
  "}",
  "const references = replaceScope();",
  ...collectReferences,
  "assert.equal(program.getRootFileNames().length, 0);",
].join("\n");

describe("member analysis cache ownership", () => {
  it("replaces a named configuration without retaining its old answer", () => {
    // Arrange
    const program = ts.createProgram([], { noLib: true });

    // Act
    const actual = (() => {
      setMemberProgramCache(program, "usage", "first", "old");
      setMemberProgramCache(program, "api", "first", "separate");
      setMemberProgramCache(program, "usage", "next", "current");
      return [
        getMemberProgramCache(program, "usage", "first"),
        getMemberProgramCache(program, "usage", "next"),
        getMemberProgramCache(program, "api", "first"),
      ];
    })();

    // Assert
    expect(actual).toStrictEqual([undefined, "current", "separate"]);
  });

  it("keeps at most one Program's option-dependent cache even when both are alive", () => {
    // Arrange
    const first = ts.createProgram([], { noLib: true });
    const next = ts.createProgram([], { noLib: true });

    // Act
    const actual = (() => {
      setMemberProgramCache(first, "usage", "same", "old");
      setMemberProgramCache(next, "usage", "same", "next");
      const replaced = getMemberProgramCache(first, "usage", "same");
      setMemberProgramCache(first, "api", "same", "rebuilt");
      return [
        replaced,
        getMemberProgramCache(next, "usage", "same"),
        getMemberProgramCache(first, "usage", "same"),
        getMemberProgramCache(first, "api", "same"),
      ];
    })();

    // Assert
    expect(actual).toStrictEqual([undefined, undefined, undefined, "rebuilt"]);
  });

  it("does not keep the last Program alive through a cache-value cycle", () => {
    // Arrange & Act
    const actual: unknown = JSON.parse(
      execFileSync(
        process.execPath,
        ["--expose-gc", "--input-type=module", "--eval", retentionProbe],
        { encoding: "utf8", timeout: 20_000 },
      ),
    );

    // Assert
    expect(actual).toStrictEqual({ released: true });
  });

  it("releases a replaced scope's usage index while its Program remains alive", () => {
    // Arrange & Act
    const actual: unknown = JSON.parse(
      execFileSync(
        process.execPath,
        ["--expose-gc", "--input-type=module", "--eval", scopeRetentionProbe],
        { encoding: "utf8", timeout: 20_000 },
      ),
    );

    // Assert
    expect(actual).toStrictEqual({ released: true });
  });
});
