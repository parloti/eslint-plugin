import { Linter } from "eslint";
import path from "node:path";
import { parser } from "typescript-eslint";
import { describe, expect, it, vi } from "vitest";

import { withTemporaryProject } from "../no-unused-exports/__tests__/no-unused-exports-utilities-test-helpers";
import { getOptions } from "../no-unused-exports/no-unused-exports-options";
import {
  isPublicApiHost,
  isPublicApiMember,
} from "./member-public-api-utilities";
import { getProductionUsageIndex } from "./member-usage-index-utilities";
import { noUnusedPublicMembersRule } from "./rule";

const MEMBER_NAMES = Array.from(
  { length: 120 },
  (_, index) => `field${String(index)}`,
);
const FEATURE_SOURCE = `export interface Feature { ${MEMBER_NAMES.map((name) => `${name}: number;`).join(" ")} }`;

describe("no-unused-public-members analysis performance", () => {
  it("resolves production reference symbols once rather than once per member", () => {
    // Arrange
    const feature = FEATURE_SOURCE;
    const files = {
      "src/consumer.ts": [
        "import type { Feature } from './feature';",
        "declare const feature: Feature;",
        ...MEMBER_NAMES.map((name) => `void feature.${name};`),
      ].join("\n"),
      "src/feature.ts": feature,
    };

    // Act
    const actual = withTemporaryProject(
      "member-analysis-performance-",
      files,
      (root, program, resolvePath) => {
        const checker = program.getTypeChecker();
        const symbolQueries = vi.spyOn(checker, "getSymbolAtLocation");
        const linter = new Linter({ configType: "flat", cwd: root });
        const config = [
          {
            files: ["**/*.ts"],
            languageOptions: {
              parser,
              parserOptions: { programs: [program], tsconfigRootDir: root },
            },
            plugins: {
              codeperfect: { rules: { members: noUnusedPublicMembersRule } },
            },
            rules: { "codeperfect/members": "error" },
          },
        ] as Parameters<typeof linter.verify>[1];
        const messages = linter.verify(
          feature,
          config,
          resolvePath("src/feature.ts"),
        );
        return { messages, queries: symbolQueries.mock.calls.length };
      },
    );

    // Assert
    expect(actual.messages).toStrictEqual([]);
    expect(actual.queries).toBeLessThan(1000);
  });

  it("reuses the production index across equivalent options and separates test patterns and roots", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "member-analysis-options-",
      {
        "src/consumer.spec.ts":
          "export const tested = { field: 1 }; void tested.field;",
        "src/consumer.ts":
          "export const value = { field: 1 }; void value.field;",
        "src/external.d.ts": "export interface External { field: number }",
      },
      (root, program) => {
        const state = getOptions([]);
        const first = getProductionUsageIndex(program, state, root);
        const equivalent = getProductionUsageIndex(
          program,
          getOptions([{ publicApiFiles: ["other.ts"] }]),
          root,
        );
        const changedTests = getProductionUsageIndex(
          program,
          getOptions([{ testFilePatterns: ["never.ts"] }]),
          root,
        );
        const changedRoot = getProductionUsageIndex(
          program,
          state,
          path.join(root, "src"),
        );
        return {
          changedRootIsSeparate: first !== changedRoot,
          changedTestsIsSeparate: first !== changedTests,
          equivalentIsReused: first === equivalent,
          productionFiles: first.sourceFiles.length,
          withTests: changedTests.sourceFiles.length,
        };
      },
    );

    // Assert
    expect(actual).toStrictEqual({
      changedRootIsSeparate: true,
      changedTestsIsSeparate: true,
      equivalentIsReused: true,
      productionFiles: 1,
      withTests: 2,
    });
  });

  it("walks public API type graphs once and keeps per-file rule options isolated", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "member-analysis-api-",
      {
        "src/feature.ts":
          "export interface Feature { exposed: number; other: number }",
        "src/index.ts": "export type { Feature } from './feature';",
      },
      (root, program, resolvePath) => {
        const checker = program.getTypeChecker();
        const sourceFile = program.getSourceFile(resolvePath("src/feature.ts"));
        if (sourceFile === void 0) {
          throw new Error("Missing feature fixture");
        }
        const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
        if (moduleSymbol === void 0) {
          throw new Error("Missing feature module symbol");
        }
        const [host] = checker.getExportsOfModule(moduleSymbol);
        if (host === void 0) {
          throw new Error("Missing feature host");
        }
        const members = checker.getPropertiesOfType(
          checker.getDeclaredTypeOfSymbol(host),
        );
        const queries = vi.spyOn(checker, "getPropertiesOfType");
        const exportTypes = vi.spyOn(checker, "getTypeOfSymbolAtLocation");
        const state = getOptions([]);
        const exposed = isPublicApiHost(program, state, root, host);
        const hostTypeQueries = exportTypes.mock.calls.length;
        const allMembersExposed = members.every((member) =>
          isPublicApiMember(program, getOptions([]), root, member),
        );
        const initialQueries = queries.mock.calls.length;
        const reused = members.every((member) =>
          isPublicApiMember(program, getOptions([]), root, member),
        );
        const repeatedQueries = queries.mock.calls.length - initialQueries;
        const otherOptions = getOptions([{ publicApiFiles: ["missing.ts"] }]);
        const nonApiMembers = members.every(
          (member) => !isPublicApiMember(program, otherOptions, root, member),
        );
        const cachedNonApiMembers = members.every(
          (member) => !isPublicApiMember(program, otherOptions, root, member),
        );
        return {
          allMembersExposed,
          cachedNonApiMembers,
          exposed,
          hostTypeQueries,
          nonApiMembers,
          otherOptionsExposed: isPublicApiHost(
            program,
            otherOptions,
            root,
            host,
          ),
          repeatedQueries,
          reused,
        };
      },
    );

    // Assert
    expect(actual).toStrictEqual({
      allMembersExposed: true,
      cachedNonApiMembers: true,
      exposed: true,
      hostTypeQueries: 0,
      nonApiMembers: true,
      otherOptionsExposed: false,
      repeatedQueries: 0,
      reused: true,
    });
  });

  it("does not reuse analysis after the TypeScript program changes", () => {
    // Arrange
    const files = {
      "src/feature.ts": "export interface Feature { field: number }",
    };
    const state = getOptions([]);

    // Act
    const actual = withTemporaryProject(
      "member-analysis-program-",
      files,
      (root, program) => {
        const previousIndex = getProductionUsageIndex(program, state, root);
        return withTemporaryProject(
          "member-analysis-next-program-",
          files,
          (_, nextProgram) =>
            getProductionUsageIndex(nextProgram, state, root) !== previousIndex,
        );
      },
    );

    // Assert
    expect(actual).toBe(true);
  });

  it("stops nested API searches before resolving unrelated generic exports", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "member-analysis-demand-",
      {
        "src/feature.ts": [
          "interface Detail { downstream: number }",
          "export type Payload = { detail: Detail };",
          "interface Builder<T> { wrap(): Builder<Builder<T>>; value: T }",
          "export declare const unrelated: Builder<string>;",
        ].join("\n"),
        "src/index.ts": "export { type Payload, unrelated } from './feature';",
      },
      (root, program, resolvePath) => {
        const checker = program.getTypeChecker();
        const sourceFile = program.getSourceFile(resolvePath("src/feature.ts"));
        if (sourceFile === void 0) {
          throw new Error("Missing API fixture");
        }
        const detail = sourceFile.statements.find((statement) =>
          statement.getText().startsWith("interface Detail"),
        );
        if (detail === void 0) {
          throw new Error("Missing Detail declaration");
        }
        const member = checker.getPropertyOfType(
          checker.getTypeAtLocation(detail),
          "downstream",
        );
        if (member === void 0) {
          throw new Error("Missing downstream member");
        }
        const queries = vi.spyOn(checker, "getTypeOfSymbolAtLocation");
        const exposed = isPublicApiMember(
          program,
          getOptions([]),
          root,
          member,
        );
        return {
          exposed,
          unrelatedQueries: queries.mock.calls.filter(
            ([symbol]) => symbol.getName() === "unrelated",
          ).length,
        };
      },
    );

    // Assert
    expect(actual).toStrictEqual({ exposed: true, unrelatedQueries: 0 });
  });
});
