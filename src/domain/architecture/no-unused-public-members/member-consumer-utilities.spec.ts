import path from "node:path";
import * as ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import { withTemporaryProject } from "../no-unused-exports/__tests__/no-unused-exports-utilities-test-helpers";
import { getOptions } from "../no-unused-exports/no-unused-exports-options";
import { createScopeLinter } from "./__tests__";
import { buildMemberConsumerIndex } from "./member-consumer-utilities";
import { getMemberAnalysisScope } from "./member-scope-utilities";

const MEMBER_NAMES = Array.from(
  { length: 120 },
  (_, index) => `field${String(index)}`,
);
const FEATURE_SOURCE = `export interface Feature { ${MEMBER_NAMES.map((name) => `${name}: number;`).join(" ")} }`;

describe("no-unused-public-members consumer pruning", () => {
  it("keeps owner-local globals and augmentations without admitting sibling sources", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "member-global-consumers-",
      {
        "packages/a/src/augmentation.ts":
          "import './feature'; declare module './feature' { interface Feature { extra: number } }",
        "packages/a/src/feature.ts":
          "export interface Feature { field: number }",
        "packages/a/src/global.ts":
          "export {}; declare global { interface GlobalShape { global: number } }",
        "packages/a/src/index.ts": "export {};",
        "packages/a/src/script.ts": "interface ScriptShape { script: number }",
        "packages/b/src/index.ts": "export {};",
        "packages/b/src/script.ts":
          "interface SiblingShape { sibling: number }",
      },
      (root, program, resolvePath) => {
        const scope = getMemberAnalysisScope(
          program,
          getOptions([]),
          root,
          resolvePath("packages/a/src/feature.ts"),
        );
        const index = buildMemberConsumerIndex(program, scope.sourceFiles);
        return [...index.getConsumers("field")]
          .map((file) => path.basename(file.fileName))
          .toSorted((left, right) => left.localeCompare(right));
      },
    );

    // Assert
    expect(actual).toStrictEqual([
      "augmentation.ts",
      "feature.ts",
      "global.ts",
      "script.ts",
    ]);
  });

  it("resolves transitive consumers through cycles without querying disconnected names", () => {
    // Arrange
    const names = MEMBER_NAMES;
    const source = FEATURE_SOURCE;

    // Act
    const actual = withTemporaryProject(
      "member-consumer-pruning-",
      {
        "src/barrel-a.ts":
          "export * from './barrel-b'; export type { Feature } from './feature';",
        "src/barrel-b.ts": "export * from './barrel-a';",
        "src/consumer.ts": [
          "import type { Feature } from './barrel-b';",
          "declare const value: Feature;",
          ...names.map((name) => `void value.${name};`),
        ].join("\n"),
        "src/feature.ts": source,
        "src/index.ts": "export {};",
        "src/noise.ts": names
          .map(
            (name, index) =>
              `export function noise${String(index)}(${name}: number) { return ${name}; }`,
          )
          .join("\n"),
      },
      (root, program, resolvePath) => {
        const queries = vi.spyOn(
          program.getTypeChecker(),
          "getSymbolAtLocation",
        );
        const { config, linter } = createScopeLinter(root, program);
        const messages = linter.verify(
          source,
          config,
          resolvePath("src/feature.ts"),
        );
        return {
          consumerQueries: queries.mock.calls.filter(
            ([node]) =>
              ts.isIdentifier(node) &&
              names.includes(node.text) &&
              path.resolve(node.getSourceFile().fileName) ===
                resolvePath("src/consumer.ts"),
          ).length,
          messages,
          noiseQueries: queries.mock.calls.filter(
            ([node]) =>
              path.resolve(node.getSourceFile().fileName) ===
              resolvePath("src/noise.ts"),
          ).length,
        };
      },
    );

    // Assert
    expect(actual).toStrictEqual({
      consumerQueries: 120,
      messages: [],
      noiseQueries: 0,
    });
  });

  it.each([
    {
      consumption: "void value.field;",
      contract: "export interface Contract { field: number }",
    },
    {
      consumption: "JSON.stringify(value);",
      contract:
        "import type { Feature } from '../src/feature'; export type Contract = Feature;",
    },
  ])(
    "preserves import-independent contract usage: $consumption",
    ({ consumption, contract }) => {
      // Arrange
      const source = "export interface Feature { field: number }";

      // Act
      const actual = withTemporaryProject(
        "member-structural-consumer-",
        {
          "contracts/shape.d.ts": contract,
          "src/consumer.ts": [
            "import type { Contract } from '../contracts/shape';",
            "declare const value: Contract;",
            consumption,
          ].join("\n"),
          "src/feature.ts": source,
          "src/index.ts": "export {};",
        },
        (root, program, resolvePath) => {
          const queries = vi.spyOn(
            program.getTypeChecker(),
            "getSymbolAtLocation",
          );
          const { config, linter } = createScopeLinter(root, program);
          const messages = linter.verify(
            source,
            config,
            resolvePath("src/feature.ts"),
          );
          return {
            directPropertyQueries: queries.mock.calls.filter(
              ([node]) =>
                ts.isIdentifier(node) &&
                node.text === "field" &&
                path.resolve(node.getSourceFile().fileName) ===
                  resolvePath("src/consumer.ts"),
            ).length,
            messages,
          };
        },
      );

      // Assert
      expect(actual).toStrictEqual({ directPropertyQueries: 0, messages: [] });
    },
  );

  it("retains implemented-contract member identities through an out-of-scope bridge", () => {
    // Arrange
    const source =
      "interface Contract { used(): void; } export class Feature implements Contract { used(): void {} }";

    // Act
    const actual = withTemporaryProject(
      "member-bridged-consumer-",
      {
        "packages/a/src/consumer.ts": [
          "import { Derived } from '../../b/bridge';",
          "new Derived().used();",
        ].join("\n"),
        "packages/a/src/feature.ts": source,
        "packages/a/src/index.ts": "export {};",
        "packages/b/bridge.ts": [
          "import { Feature } from '../a/src/feature';",
          "export class Derived extends Feature { extra = 1; }",
        ].join("\n"),
      },
      (root, program, resolvePath) => {
        const { config, linter } = createScopeLinter(root, program);
        return linter.verify(
          source,
          config,
          resolvePath("packages/a/src/feature.ts"),
        );
      },
    );

    // Assert
    expect(actual).toStrictEqual([]);
  });

  it("keeps local and observed consumers even when their folder direction is forbidden", () => {
    // Arrange
    const source = [
      "class Local { used(): void {} unused(): void {} }",
      "new Local().used();",
      "export class Feature { used(): void {} unused(): void {} }",
    ].join("\n");

    // Act
    const actual = withTemporaryProject(
      "member-folder-consumer-",
      {
        "src/domain/consumer.ts": [
          "import { Feature } from '../infrastructure/feature';",
          "new Feature().used();",
        ].join("\n"),
        "src/index.ts": "export {};",
        "src/infrastructure/feature.ts": source,
      },
      (root, program, resolvePath) => {
        const { config, linter } = createScopeLinter(root, program);
        return linter
          .verify(source, config, resolvePath("src/infrastructure/feature.ts"))
          .map((message) => ({
            line: message.line,
            messageId: message.messageId,
          }));
      },
    );

    // Assert
    expect(actual).toStrictEqual([
      { line: 1, messageId: "unusedPublicMember" },
      { line: 3, messageId: "unusedPublicMember" },
    ]);
  });
});
