import path from "node:path";
import * as ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import { EXPORTED_FEATURE_VALUE_ELEMENT } from "../no-unused-exports/__tests__/no-unused-exports-usage-fixture-helpers";
import { withTemporaryProject } from "../no-unused-exports/__tests__/no-unused-exports-utilities-test-helpers";
import { getOptions } from "../no-unused-exports/no-unused-exports-options";
import { collectCrossFileUsages } from "../no-unused-exports/no-unused-exports-usage-utilities";
import { getProductionUsageIndex } from "../no-unused-public-members/member-usage-index-utilities";
import {
  getSourceFileFacts,
  getSourceReferenceSymbol,
} from "./source-file-facts";

const createSourceTraversalFixture = () => {
  const source = ts.createSourceFile(
    "source.ts",
    "export const box = { 7: 1, value }; consume({ ...box }); void box['7'];",
    ts.ScriptTarget.Latest,
    true,
  );
  const statements = source.statements;
  const traversals = vi.fn(() => statements);
  Object.defineProperty(source, "statements", { get: traversals });
  return { source, traversals };
};

describe("shared source facts", () => {
  it("collects module arguments without treating other strings or type arguments as dependencies", () => {
    // Arrange
    const source = ts.createSourceFile(
      "source.ts",
      [
        "import { value } from './imported';",
        "export { value } from './reexported';",
        "type Shape = import('./types').Generic<'./not-a-module'>;",
        "import Legacy = require('./legacy');",
        "void import('./dynamic', { with: { type: 'json' } });",
        "void require('./required', './not-first');",
        "consume('./not-import');",
        "type Tag = './not-type';",
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
    );

    // Act
    const actual = getSourceFileFacts(source).moduleSpecifiers.map(
      (specifier) => specifier.text,
    );

    // Assert
    expect(actual).toStrictEqual([
      "./imported",
      "./reexported",
      "./types",
      "./legacy",
      "./dynamic",
      "./required",
    ]);
  });

  it("walks syntax once while preserving reference names and candidate operations", () => {
    // Arrange
    const fixture = createSourceTraversalFixture();

    // Act
    const actual = {
      first: getSourceFileFacts(fixture.source),
      repeated: getSourceFileFacts(fixture.source),
    };

    // Assert
    expect(fixture.traversals).toHaveBeenCalledOnce();
    expect(actual.repeated).toBe(actual.first);
    expect(actual.first.references.map((node) => node.text)).toStrictEqual([
      "box",
      "7",
      "1",
      "value",
      "consume",
      "box",
      "box",
      "7",
    ]);
    expect(
      actual.first.operations.map((node) => node.getText(fixture.source)),
    ).toStrictEqual([
      "7: 1",
      "value",
      "consume({ ...box })",
      "...box",
      "box['7']",
    ]);
  });

  it.each(["exports-first", "members-first"])(
    "shares reference resolution with the member index in %s order",
    (order) => {
      // Arrange & Act
      const actual = withTemporaryProject(
        "unused-rules-shared-reference-",
        {
          "src/consumer.ts":
            "import { feature } from './feature'; void feature.field;",
          "src/feature.ts": "export const feature = { field: 1 };",
          "src/names.ts": "export const field = 0;",
        },
        (root, program, resolvePath) => {
          const queries = vi.spyOn(
            program.getTypeChecker(),
            "getSymbolAtLocation",
          );
          if (order === "members-first") {
            getProductionUsageIndex(program, getOptions([]), root);
          }
          const usages = collectCrossFileUsages(
            program,
            resolvePath("src/feature.ts"),
            getOptions([]),
            root,
            EXPORTED_FEATURE_VALUE_ELEMENT,
          );
          const members = getProductionUsageIndex(
            program,
            getOptions([]),
            root,
          );
          return {
            exports: usages,
            memberSymbols: members.symbols.size,
            propertyQueries: queries.mock.calls.filter(
              ([node]) =>
                ts.isIdentifier(node) &&
                node.text === "field" &&
                ts.isPropertyAccessExpression(node.parent) &&
                path.resolve(node.getSourceFile().fileName) ===
                  resolvePath("src/consumer.ts"),
            ).length,
          };
        },
      );

      // Assert
      expect(actual.exports).toStrictEqual([{ isTestFile: false }]);
      expect(actual.memberSymbols).toBeGreaterThan(0);
      expect(actual.propertyQueries).toBe(1);
    },
  );

  it("caches absent symbols but resolves a reused AST again in a different Program", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "shared-source-symbols-",
      { "src/consumer.ts": "export {}; void missing;" },
      (root, program, resolvePath) => {
        const source = program.getSourceFile(resolvePath("src/consumer.ts"));
        if (source === void 0) {
          throw new Error("Missing source fact fixture");
        }
        const facts = getSourceFileFacts(source);
        const reference = facts.references.find(
          (node) => node.text === "missing",
        );
        if (reference === void 0) {
          throw new Error("Missing unresolved reference fixture");
        }
        const firstQueries = vi.spyOn(
          program.getTypeChecker(),
          "getSymbolAtLocation",
        );
        const first = getSourceReferenceSymbol(program, reference);
        const repeated = getSourceReferenceSymbol(program, reference);
        const host = ts.createCompilerHost(program.getCompilerOptions());
        const readSource = host.getSourceFile;
        host.getCurrentDirectory = () => root;
        host.getSourceFile = (filename, version, onError, createNew) =>
          program.getSourceFile(filename) ??
          readSource(filename, version, onError, createNew);
        const next = ts.createProgram(
          program.getRootFileNames(),
          program.getCompilerOptions(),
          host,
        );
        const nextQueries = vi.spyOn(
          next.getTypeChecker(),
          "getSymbolAtLocation",
        );
        const nextSymbol = getSourceReferenceSymbol(next, reference);
        return {
          first,
          firstQueries: firstQueries.mock.calls.length,
          nextQueries: nextQueries.mock.calls.length,
          nextSymbol,
          repeated,
          reusedSyntax:
            next.getSourceFile(resolvePath("src/consumer.ts")) === source &&
            getSourceFileFacts(source) === facts,
        };
      },
    );

    // Assert
    expect(actual).toStrictEqual({
      first: void 0,
      firstQueries: 1,
      nextQueries: 1,
      nextSymbol: void 0,
      repeated: void 0,
      reusedSyntax: true,
    });
  });
});
