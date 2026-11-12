import path from "node:path";
import * as ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import { withTemporaryProject } from "../no-unused-exports/__tests__/no-unused-exports-utilities-test-helpers";
import { createScopeLinter } from "./__tests__";

describe("no-unused-public-members scoped local flow", () => {
  it.each(["JSON.stringify(rest);", "client.request({ body: rest });"])(
    "forwards trailing arguments into a rest parameter for %s",
    (sink) => {
      // Arrange
      const source = "export interface Feature { value: number }";

      // Act
      const actual = withTemporaryProject(
        "member-rest-parameter-flow-",
        {
          "src/feature.ts": source,
          "src/flow.ts": [
            "import type { Feature } from './feature';",
            "declare const value: Feature;",
            "declare const client: { request(options: { body: unknown }): void };",
            `function consume(head: unknown, ...rest: unknown[]): void { ${sink} }`,
            "consume({}, {}, value);",
          ].join("\n"),
          "src/index.ts": "export {};",
        },
        (root, program, resolvePath) => {
          const { config, linter } = createScopeLinter(root, program);
          return linter.verify(source, config, resolvePath("src/feature.ts"));
        },
      );

      // Assert
      expect(actual).toStrictEqual([]);
    },
  );

  it("completes negative forwarding summaries once across unresolved members", () => {
    // Arrange
    const source = `export interface Feature { ${Array.from(
      { length: 40 },
      (_, index) => `field${String(index)}: number;`,
    ).join(" ")} }`;
    const functions = Array.from(
      { length: 50 },
      (_, index) =>
        `function step${String(index)}(value: unknown): void { const alias = value; step${String((index + 1) % 50)}(alias); }`,
    ).join("\n");

    // Act
    const actual = withTemporaryProject(
      "member-negative-local-flow-",
      {
        "src/feature.ts": source,
        "src/flow.ts": [
          "import type { Feature } from './feature';",
          "declare const value: Feature;",
          functions,
          "step0(value);",
        ].join("\n"),
        "src/index.ts": "export {};",
      },
      (root, program, resolvePath) => {
        const symbols = vi.spyOn(
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
          aliases: symbols.mock.calls.filter(
            ([node]) =>
              !ts.isSourceFile(node) &&
              ts.isVariableDeclaration(node.parent) &&
              node.parent.initializer === node &&
              node.getText() === "value" &&
              path.resolve(node.getSourceFile().fileName) ===
                resolvePath("src/flow.ts"),
          ).length,
          messages: messages.map((message) => message.messageId),
          parameterQueries: symbols.mock.calls.filter(
            ([node]) =>
              !ts.isSourceFile(node) &&
              ts.isParameter(node.parent) &&
              path.resolve(node.getSourceFile().fileName) ===
                resolvePath("src/flow.ts"),
          ).length,
        };
      },
    );

    // Assert
    expect(actual.messages).toStrictEqual(
      Array.from({ length: 40 }, () => "unusedPublicMember"),
    );
    expect(actual.aliases).toBeGreaterThan(0);
    expect(actual.aliases).toBeLessThan(150);
    expect(actual.parameterQueries).toBeLessThan(75);
  });

  it.each(["JSON.stringify(first);", "client.request({ body: first });"])(
    "keeps recursive parameter positions distinct for %s",
    (sink) => {
      // Arrange
      const source =
        "export interface Used { live: number } export interface Dead { unused: number }";

      // Act
      const actual = withTemporaryProject(
        "member-recursive-parameter-flow-",
        {
          "src/feature.ts": source,
          "src/flow.ts": [
            "import type { Used, Dead } from './feature';",
            "declare const used: Used; declare const dead: Dead; declare const stop: boolean;",
            "declare const client: { request(options: { body: unknown }): void };",
            "function a(left: unknown, right: unknown): void { b(right, left); }",
            `function b(first: unknown, second: unknown): void { if (stop) a(second, first); ${sink} }`,
            "a(dead, used);",
          ].join("\n"),
          "src/index.ts": "export {};",
        },
        (root, program, resolvePath) => {
          const { config, linter } = createScopeLinter(root, program);
          return linter
            .verify(source, config, resolvePath("src/feature.ts"))
            .map((message) => message.message);
        },
      );

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0]).toContain("'unused'");
    },
  );

  it.each([
    {
      consumer: "forward(new Feature());",
      implementation:
        "export function consume(value: unknown): void { JSON.stringify(value); }",
      name: "nested serialization",
    },
    {
      consumer: "forward(new Feature());",
      implementation: [
        "declare const client: { request(options: { body?: unknown }): void };",
        "export function consume(value: unknown): void { client.request({ body: value }); }",
      ].join("\n"),
      name: "nested request bodies",
    },
    {
      consumer: "JSON.stringify(consume());",
      implementation: [
        'import { Feature } from "../../a/src/feature";',
        "export function consume(): object { return new Feature(); }",
      ].join("\n"),
      name: "factory returns",
    },
  ])(
    "does not inspect sibling $name or reuse a broader scope's result",
    ({ consumer, implementation }) => {
      // Arrange
      const source = "export class Feature { value = 1; }";

      // Act
      const actual = withTemporaryProject(
        "member-scoped-local-flow-",
        {
          "packages/a/src/consumer.ts": [
            'import { Feature } from "./feature";',
            'import { forward } from "./forward";',
            'import { consume } from "../../b/src/consumer";',
            consumer,
          ].join("\n"),
          "packages/a/src/feature.ts": source,
          "packages/a/src/forward.ts": [
            'import { consume } from "../../b/src/consumer";',
            "export function forward(value: unknown): void { consume(value); }",
          ].join("\n"),
          "packages/a/src/index.ts": "export {};",
          "packages/b/src/consumer.ts": implementation,
          "packages/b/src/index.ts": "export {};",
          "packages/index.ts": "export {};",
        },
        (root, program, resolvePath) => {
          const broad = createScopeLinter(root, program, {
            publicApiFiles: ["packages/index.ts"],
          });
          const narrow = createScopeLinter(root, program);
          const filename = resolvePath("packages/a/src/feature.ts");
          const symbols = vi.spyOn(
            program.getTypeChecker(),
            "getSymbolAtLocation",
          );
          const first = broad.linter.verify(source, broad.config, filename);
          symbols.mockClear();
          const scoped = narrow.linter.verify(source, narrow.config, filename);
          const siblingSymbols = symbols.mock.calls.filter(
            ([node]) =>
              path.resolve(node.getSourceFile().fileName) ===
              resolvePath("packages/b/src/consumer.ts"),
          ).length;
          const repeated = broad.linter.verify(source, broad.config, filename);
          return {
            messages: [first, scoped, repeated].map((messages) =>
              messages.map((message) => message.messageId),
            ),
            siblingSymbols,
          };
        },
      );

      // Assert
      expect(actual).toStrictEqual({
        messages: [[], ["unusedPublicMember"], []],
        siblingSymbols: 0,
      });
    },
  );
});
