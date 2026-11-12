import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { withTemporaryProject } from "../no-unused-exports/__tests__/no-unused-exports-utilities-test-helpers";
import { createScopeLinter } from "./__tests__";

const MEMBER_NAMES = Array.from(
  { length: 80 },
  (_, index) => `field${String(index)}`,
);
const FEATURE_SOURCE = `export interface Feature { ${MEMBER_NAMES.map((name) => `${name}: number;`).join(" ")} }`;

describe("no-unused-public-members operation summaries", () => {
  it.each([
    {
      initial: "",
      operation: "void data['unrelated']; JSON.stringify(1);",
      unused: 80,
    },
    {
      initial:
        "import type { Feature } from './feature'; declare const value: Feature; void { ...value };",
      operation: "JSON.stringify(data); void data[key];",
      unused: 0,
    },
  ])(
    "defers unrelated operation queries with $unused pending members",
    ({ initial, operation, unused }) => {
      // Arrange & Act
      const actual = withTemporaryProject(
        "member-irrelevant-operations-",
        {
          "src/feature.ts": FEATURE_SOURCE,
          "src/index.ts": "export {};",
          "src/operations.ts": [
            initial,
            "declare const data: Record<string, number>;",
            "declare const key: string;",
            operation,
          ].join("\n"),
        },
        (root, program, resolvePath) => {
          const checker = program.getTypeChecker();
          const signatures = vi.spyOn(checker, "getResolvedSignature");
          const types = vi.spyOn(checker, "getTypeAtLocation");
          const { config, linter } = createScopeLinter(root, program);
          const messages = linter.verify(
            FEATURE_SOURCE,
            config,
            resolvePath("src/feature.ts"),
          );
          return {
            messages: messages.length,
            signatures: signatures.mock.calls.length,
            types: types.mock.calls.filter(
              ([node]) =>
                path.resolve(node.getSourceFile().fileName) ===
                  resolvePath("src/operations.ts") &&
                (node.getText() === "data" || node.getText() === "key"),
            ).length,
          };
        },
      );

      // Assert
      expect(actual).toStrictEqual({
        messages: unused,
        signatures: 0,
        types: 0,
      });
    },
  );

  it("does not resolve operation signatures or computed key types when direct reads cover every candidate", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "member-unused-operation-types-",
      {
        "src/consumer.ts": [
          "import type { Feature } from './feature';",
          "declare const feature: Feature;",
          ...MEMBER_NAMES.map((name) => `void feature.${name};`),
        ].join("\n"),
        "src/feature.ts": FEATURE_SOURCE,
        "src/index.ts": "export {};",
        "src/noise.ts": [
          "declare const data: Record<string, number>;",
          "declare const key: string;",
          "JSON.stringify(data);",
          "void data[key];",
        ].join("\n"),
      },
      (root, program, resolvePath) => {
        const checker = program.getTypeChecker();
        const signatures = vi.spyOn(checker, "getResolvedSignature");
        const types = vi.spyOn(checker, "getTypeAtLocation");
        const { config, linter } = createScopeLinter(root, program);
        const messages = linter.verify(
          FEATURE_SOURCE,
          config,
          resolvePath("src/feature.ts"),
        );
        return {
          messages,
          noiseSignatures: signatures.mock.calls.filter(
            ([call]) =>
              path.resolve(call.getSourceFile().fileName) ===
              resolvePath("src/noise.ts"),
          ).length,
          noiseTypes: types.mock.calls.filter(
            ([node]) =>
              path.resolve(node.getSourceFile().fileName) ===
              resolvePath("src/noise.ts"),
          ).length,
        };
      },
    );

    // Assert
    expect(actual).toStrictEqual({
      messages: [],
      noiseSignatures: 0,
      noiseTypes: 0,
    });
  });

  it("shares operation type queries across unresolved members and reuses completed results", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "member-operation-scaling-",
      {
        "src/feature.ts": FEATURE_SOURCE,
        "src/index.ts": "export {};",
        "src/operations.ts": [
          "interface Other { unrelated: number }",
          "declare const other: Other;",
          "declare const key: string;",
          "declare function send(value: Other): void;",
          "void { ...other };",
          "JSON.stringify(other);",
          "void other[key];",
          "send(other);",
        ].join("\n"),
      },
      (root, program, resolvePath) => {
        const checker = program.getTypeChecker();
        const types = vi.spyOn(checker, "getTypeAtLocation");
        const contextualTypes = vi.spyOn(checker, "getContextualType");
        const properties = vi.spyOn(checker, "getPropertyOfType");
        const { config, linter } = createScopeLinter(root, program);
        const first = linter.verify(
          FEATURE_SOURCE,
          config,
          resolvePath("src/feature.ts"),
        );
        const operationQueries = () =>
          types.mock.calls.filter(
            ([node]) =>
              path.resolve(node.getSourceFile().fileName) ===
              resolvePath("src/operations.ts"),
          ).length +
          contextualTypes.mock.calls.filter(
            ([node]) =>
              path.resolve(node.getSourceFile().fileName) ===
              resolvePath("src/operations.ts"),
          ).length;
        const firstQueries = operationQueries();
        const operationProperties = () =>
          properties.mock.calls.filter(
            ([type]) => type.getSymbol()?.getName() === "Other",
          ).length;
        const firstProperties = operationProperties();
        const repeated = linter.verify(
          FEATURE_SOURCE,
          config,
          resolvePath("src/feature.ts"),
        );
        return {
          first: first.map((message) => message.messageId),
          firstProperties,
          firstQueries,
          repeated: repeated.map((message) => message.messageId),
          repeatedProperties: operationProperties() - firstProperties,
          repeatedQueries: operationQueries() - firstQueries,
        };
      },
    );

    // Assert
    expect(actual.first).toStrictEqual(
      MEMBER_NAMES.map(() => "unusedPublicMember"),
    );
    expect(actual.repeated).toStrictEqual(actual.first);
    expect(actual.firstQueries).toBeLessThan(20);
    expect(actual.firstProperties).toBeGreaterThan(0);
    expect(actual.repeatedProperties).toBe(0);
    expect(actual.repeatedQueries).toBe(0);
  });

  it.each([
    { operation: "void { ...value };", unused: ["nested", "method"] },
    { operation: "JSON.stringify(value);", unused: ["method"] },
    { operation: "send(value);", unused: ["nested", "method"] },
    { operation: "void value[key];", unused: ["nested", "method"] },
  ])(
    "preserves shallow, nested, signature and prototype semantics for $operation",
    ({ operation, unused }) => {
      // Arrange
      const source = [
        "interface Detail { nested: number }",
        "export class Feature {",
        "  own = 1;",
        "  detail!: Detail;",
        "  method(): void {}",
        "}",
      ].join("\n");

      // Act
      const actual = withTemporaryProject(
        "member-operation-semantics-",
        {
          "external.d.ts":
            "export declare function send(value: { own: number; detail: { nested: number } }): void;",
          "src/feature.ts": source,
          "src/index.ts": "export {};",
          "src/operations.ts": [
            "import { Feature } from './feature';",
            "import { send } from '../external';",
            "declare const value: Feature;",
            "declare const key: 'own' | 'detail';",
            operation,
          ].join("\n"),
        },
        (root, program, resolvePath) => {
          const { config, linter } = createScopeLinter(root, program);
          const first = linter.verify(
            source,
            config,
            resolvePath("src/feature.ts"),
          );
          const repeated = linter.verify(
            source,
            config,
            resolvePath("src/feature.ts"),
          );
          return [first, repeated].map((messages) =>
            messages.map((message) => message.message),
          );
        },
      );

      // Assert
      expect(actual[1]).toStrictEqual(actual[0]);
      for (const messages of actual) {
        expect(messages).toHaveLength(unused.length);
        for (const name of unused) {
          expect(
            messages.some((message) => message.includes(`'${name}'`)),
          ).toBe(true);
        }
      }
    },
  );
});
