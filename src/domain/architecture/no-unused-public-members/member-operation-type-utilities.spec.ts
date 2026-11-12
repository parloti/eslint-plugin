import * as ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import { withTemporaryProject } from "../no-unused-exports/__tests__/no-unused-exports-utilities-test-helpers";
import {
  getUsageContextualType,
  getUsageProperties,
  getUsageType,
} from "./member-operation-type-utilities";

describe("operation semantic snapshots", () => {
  it("reuses node and property facts without leaking them into a replacement checker with the same AST", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "member-operation-snapshot-",
      { "src/value.ts": "export const value = { field: 1 };" },
      (root, program, resolvePath) => {
        const source = program.getSourceFile(resolvePath("src/value.ts"));
        const statement = source?.statements[0];
        const declaration =
          statement !== void 0 && ts.isVariableStatement(statement)
            ? statement.declarationList.declarations[0]
            : void 0;
        const expression = declaration?.initializer;
        if (source === void 0 || expression === void 0) {
          throw new Error("Missing operation snapshot fixture");
        }
        const checker = program.getTypeChecker();
        const queries = vi.spyOn(checker, "getTypeAtLocation");
        const contexts = vi.spyOn(checker, "getContextualType");
        const properties = vi.spyOn(checker, "getPropertiesOfType");
        const type = getUsageType(expression, checker);
        const firstProperties = getUsageProperties(type, checker);
        const firstContext = getUsageContextualType(expression, checker);
        getUsageType(expression, checker);
        getUsageProperties(type, checker);
        getUsageContextualType(expression, checker);
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
        const nextChecker = next.getTypeChecker();
        const nextQueries = vi.spyOn(nextChecker, "getTypeAtLocation");
        getUsageType(expression, nextChecker);
        return {
          contextQueries: contexts.mock.calls.length,
          firstContext,
          firstQueries: queries.mock.calls.length,
          nextQueries: nextQueries.mock.calls.length,
          properties: firstProperties.map((property) => property.getName()),
          propertyQueries: properties.mock.calls.length,
          reusedSyntax:
            next.getSourceFile(resolvePath("src/value.ts")) === source,
        };
      },
    );

    // Assert
    expect(actual).toStrictEqual({
      contextQueries: 1,
      firstContext: void 0,
      firstQueries: 1,
      nextQueries: 1,
      properties: ["field"],
      propertyQueries: 1,
      reusedSyntax: true,
    });
  });
});
