import { afterAll, describe, expect, it } from "vitest";

import { createTemporaryFixtureManager } from "../../../../tests/support";
import { createFixtureLintRunner } from "../../../../tests/support/no-unused-public-members-fixtures";

describe("no-unused-public-members rule edge cases", () => {
  const fixtureManager = createTemporaryFixtureManager();
  const runFixtureLint = createFixtureLintRunner(fixtureManager);

  afterAll(() => {
    fixtureManager.cleanupTemporaryDirectories();
  });

  it("reports unused direct members of untyped const objects without checking nested objects", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import { feature } from "./feature";',
          "feature.run();",
          "void feature.used;",
          "void feature.nested;",
        ].join("\n"),
        "src/feature.ts": [
          "export const feature = {",
          "  used: 1,",
          "  unused: 2,",
          "  run(): void {},",
          "  unusedRun(): void {},",
          "  nested: { inner: true },",
          "};",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([
      "unusedPublicMember",
      "unusedPublicMember",
    ]);
  });

  it("unwraps supported const initializers and recognizes quoted and numeric member names", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "const dynamicName = 'dynamic';",
          "export class Feature {",
          "  'quoted-name' = 1;",
          "  7 = 2;",
          "  [dynamicName] = 3;",
          "  #privateField = 4;",
          "}",
          "export const asserted = ({ kept: 1, dead: 2 } as const);",
          "export const satisfied = ({ kept: 1, dead: 2 } satisfies Record<string, number>);",
          "export const parenthesized = ((({ kept: 1, dead: 2 })));",
          "export const nonNull = ({ kept: 1, dead: 2 } as Record<string, number>)!;",
          "export const typeAsserted = <Record<string, number>>{ kept: 1, dead: 2 };",
          "declare const withoutInitializer: { ignored: number };",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toHaveLength(12);
    expect(
      actualMessages.every((messageId) => messageId === "unusedPublicMember"),
    ).toBe(true);
  });

  it("recognizes members exposed by a nested public API object", async () => {
    // Arrange
    const run = {
      files: {
        "src/index.ts": [
          'import { internal } from "./internal";',
          "export const api = {",
          "  deep: { deeper: { deepest: { value: true } } },",
          "  internal,",
          "};",
        ].join("\n"),
        "src/internal.ts": [
          "export const internal = {",
          "  usedDownstream(): void {},",
          "  alsoDownstream(): void {},",
          "};",
        ].join("\n"),
      },
      targetRelativePath: "src/internal.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });

  it("handles anonymous class hosts and public API files without module exports", async () => {
    // Arrange
    const run = {
      files: {
        "src/anonymous.ts": "export default class { unused(): void {} }",
        "src/index.ts": "const scriptOnly = 1;",
      },
      ruleOptions: [{ publicApiFiles: ["**/src/index.ts"] }],
      targetRelativePath: "src/anonymous.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("recognizes computed keys and structurally matching property reads", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import type { Feature, NumericFeature } from "./feature";',
          "declare const feature: Feature;",
          "declare const numeric: NumericFeature;",
          'const key: "selected" | "missing" = Math.random() ? "selected" : "missing";',
          'const dynamicKey: string = "selected";',
          "void feature[key];",
          'void feature["selected"];',
          "void feature[dynamicKey];",
          "const { destructured } = feature; void destructured;",
          "function readParameter({ parameter }: Feature): boolean { return parameter; }",
          'const structurallyMatching: { selected: string; unused: boolean; structural: number; destructured: number; parameter: boolean } = { selected: "value", unused: false, structural: 1, destructured: 2, parameter: true };',
          'void structurallyMatching["structural"];',
          "function readShape(value: { selected: string; unused: boolean }): string {",
          "  return value.selected;",
          "}",
          "declare const source: { selected: string; unused: boolean };",
          "const { selected: copied } = source; void copied;",
          "function readDestructured({ selected: parameterValue }: { selected: string; unused: boolean }): string {",
          "  return parameterValue;",
          "}",
          "function readWiderShape(value: { selected: string; unused: boolean; extra: number }): string {",
          "  return value.selected;",
          "}",
          'declare const empty: object; void empty["selected"];',
          "void numeric[7];",
        ].join("\n"),
        "src/feature.ts": [
          "export interface Feature {",
          "  selected: string;",
          "  unused: boolean;",
          "  structural: number;",
          "  destructured: number;",
          "  parameter: boolean;",
          "}",
          "export type NumericFeature = {",
          "  7: boolean;",
          "  unused: boolean;",
          "};",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([
      "unusedPublicMember",
      "unusedPublicMember",
    ]);
  });

  it("links object members through external property contracts", async () => {
    // Arrange
    const run = {
      files: {
        "src/external-api.d.ts": [
          'declare module "external-api" {',
          "  export interface Options {",
          "    shorthand?: { selected: string };",
          "    assigned?: { selected: string };",
          "  }",
          "  export function forward(options: Options): void;",
          "}",
        ].join("\n"),
        "src/feature.ts": [
          'import { forward } from "external-api";',
          'export const shorthand = { selected: "one", unused: true };',
          'export const assigned = { selected: "two", unused: true };',
          "forward({ shorthand });",
          "forward({ assigned: assigned });",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([
      "unusedPublicMember",
      "unusedPublicMember",
    ]);
  });

  it("skips files matched by the configured test-file patterns", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.spec.ts": "export class Feature { unused(): void {} }",
      },
      targetRelativePath: "src/feature.spec.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });

  it("counts external call handoffs and ignores local implementation calls", async () => {
    // Arrange
    const run = {
      files: {
        "src/external-api.d.ts": [
          'declare module "external-api" {',
          "  export function accept(options: { mode: string }): void;",
          "  export function acceptWrong(options: { other: string }): void;",
          "  export function infer<T>(options: T): void;",
          "  export function single(options: { mode: string }): void;",
          "}",
        ].join("\n"),
        "src/feature.ts": [
          'import { accept } from "external-api";',
          'export const external = { mode: "safe", unused: true };',
          'export const local = { localMode: "local", unused: true };',
          "export interface CallOptions { mode: string; unused: boolean }",
          "accept({ mode: external.mode });",
          'acceptWrong({ mode: "ignored" });',
          'accept({ ["mode"]: external.mode });',
          "infer({ mode: external.mode });",
          "single({ mode: external.mode }, { mode: external.mode });",
          "missing({ mode: external.mode });",
          'missing({ mode: "unresolved" });',
          "function localAccept(options: { localMode: string }): void { void options; }",
          'localAccept({ localMode: "local" });',
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
    ]);
  });
});
