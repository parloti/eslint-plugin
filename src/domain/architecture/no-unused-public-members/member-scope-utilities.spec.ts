import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { withTemporaryProject } from "../no-unused-exports/__tests__/no-unused-exports-utilities-test-helpers";
import { createScopeLinter } from "./__tests__";

describe("no-unused-public-members package ownership", () => {
  it("isolates completed operation results when production eligibility alternates", () => {
    // Arrange
    const source = "export interface Feature { field: number }";

    // Act
    const actual = withTemporaryProject(
      "member-operation-options-",
      {
        "src/feature.ts": source,
        "src/index.ts": "export {};",
        "src/serialize.spec.ts":
          "import type { Feature } from './feature'; declare const value: Feature; JSON.stringify(value);",
      },
      (root, program, resolvePath) => {
        const baseline = createScopeLinter(root, program);
        const withTests = createScopeLinter(root, program, {
          testFilePatterns: ["never.ts"],
        });
        const filename = resolvePath("src/feature.ts");
        const first = baseline.linter.verify(source, baseline.config, filename);
        const testsCount = withTests.linter.verify(
          source,
          withTests.config,
          filename,
        );
        const repeated = baseline.linter.verify(
          source,
          baseline.config,
          filename,
        );
        return [first, testsCount, repeated].map((messages) =>
          messages.map((message) => message.messageId),
        );
      },
    );

    // Assert
    expect(actual).toStrictEqual([
      ["unusedPublicMember"],
      [],
      ["unusedPublicMember"],
    ]);
  });

  it("reports sibling-only member use without changing export consumption", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "member-sibling-consumer-",
      {
        "packages/a/src/feature.ts":
          "export class Feature { siblingOnly(): void {} }",
        "packages/a/src/index.ts": "export {};",
        "packages/b/src/consumer.ts": [
          'import { Feature } from "../../a/src/feature";',
          "new Feature().siblingOnly();",
        ].join("\n"),
        "packages/b/src/index.ts": "export {};",
      },
      (root, program, resolvePath) => {
        const { config, linter } = createScopeLinter(root, program);
        const filename = resolvePath("packages/a/src/feature.ts");
        const source = "export class Feature { siblingOnly(): void {} }";
        const memberOnly = linter.verify(source, config, filename);
        const both = linter.verify(
          source,
          [...config, { rules: { "codeperfect/no-unused-exports": "error" } }],
          filename,
        );
        const exportOnly = linter.verify(
          source,
          [
            ...config,
            {
              rules: {
                "codeperfect/no-unused-exports": "error",
                "codeperfect/no-unused-public-members": "off",
              },
            },
          ],
          filename,
        );
        return {
          both: both.map((message) => message.messageId),
          exportOnly,
          memberOnly: memberOnly.map((message) => message.messageId),
        };
      },
    );

    // Assert
    expect(actual).toStrictEqual({
      both: ["unusedPublicMember"],
      exportOnly: [],
      memberOnly: ["unusedPublicMember"],
    });
  });

  it("keeps local hosts, internal barrels, and same-package consumers in one scope", () => {
    // Arrange
    const source = [
      "class Local { used(): void {} unused(): void {} }",
      "new Local().used();",
      "export class Feature { used(): void {} unused(): void {} }",
    ].join("\n");

    // Act
    const actual = withTemporaryProject(
      "member-internal-barrels-",
      {
        "src/feature1/consumer.ts": [
          'import { Feature } from "../feature";',
          "new Feature().used();",
        ].join("\n"),
        "src/feature/index.ts": 'export { Feature } from "./service";',
        "src/feature/service.ts": source,
        "src/index.ts": "export {};",
      },
      (root, program, resolvePath) => {
        const { config, linter } = createScopeLinter(root, program);
        return linter
          .verify(source, config, resolvePath("src/feature/service.ts"))
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

  it("does not resolve sibling calls or heritage types while checking the owner's usage", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "member-sibling-operations-",
      {
        "packages/a/src/feature.ts":
          "export interface Feature { siblingOnly: number }",
        "packages/a/src/index.ts": "export {};",
        "packages/b/src/consumer.ts": [
          'import type { Feature } from "../../a/src/feature";',
          "interface Sibling extends Feature { siblingOnly: number }",
          "declare const feature: Feature;",
          "JSON.stringify(feature);",
        ].join("\n"),
        "packages/b/src/index.ts": "export {};",
      },
      (root, program, resolvePath) => {
        const checker = program.getTypeChecker();
        const calls = vi.spyOn(checker, "getResolvedSignature");
        const types = vi.spyOn(checker, "getTypeAtLocation");
        const { config, linter } = createScopeLinter(root, program);
        const messages = linter.verify(
          "export interface Feature { siblingOnly: number }",
          config,
          resolvePath("packages/a/src/feature.ts"),
        );
        return {
          messages: messages.map((message) => message.messageId),
          siblingCalls: calls.mock.calls.filter(
            ([call]) =>
              path.resolve(call.getSourceFile().fileName) ===
              resolvePath("packages/b/src/consumer.ts"),
          ).length,
          siblingTypes: types.mock.calls.filter(
            ([node]) =>
              path.resolve(node.getSourceFile().fileName) ===
              resolvePath("packages/b/src/consumer.ts"),
          ).length,
        };
      },
    );

    // Assert
    expect(actual).toStrictEqual({
      messages: ["unusedPublicMember"],
      siblingCalls: 0,
      siblingTypes: 0,
    });
  });

  it.each([
    {
      entry: "src/feature/index.ts",
      options: ["src/index.ts", "src/feature/index.ts"],
    },
    { entry: "src/index.spec.ts", options: ["src/index.spec.ts"] },
    { entry: "src/index.d.ts", options: ["src/index.d.ts"] },
    { entry: "src/other.ts", options: ["src/missing.ts"] },
    { entry: "src/api/public.ts", options: ["src/api/public.ts"] },
    { entry: "src/feature/index.ts", options: ["src/feature/index.ts"] },
  ])(
    "rejects invalid ownership with API entry $entry and patterns $options",
    ({ entry, options }) => {
      // Arrange & Act & Assert
      expect(() =>
        withTemporaryProject(
          "member-invalid-ownership-",
          {
            [entry]: "export {};",
            "src/feature.ts": "export class Feature { unused(): void {} }",
            "src/index.ts": "export {};",
          },
          (root, program, resolvePath) => {
            const baseline = createScopeLinter(root, program, {
              publicApiFiles: ["src/index.ts"],
            });
            baseline.linter.verify(
              "export class Feature { unused(): void {} }",
              baseline.config,
              resolvePath("src/feature.ts"),
            );
            const { config, linter } = createScopeLinter(root, program, {
              publicApiFiles: options,
            });
            return linter.verify(
              "export class Feature { unused(): void {} }",
              config,
              resolvePath("src/feature.ts"),
            );
          },
        ),
      ).toThrow(/publicApiFiles/);
    },
  );

  it("deduplicates entries and isolates alternating per-file API and test options", () => {
    // Arrange
    const source = "export class Feature { tested(): void {} }";

    // Act
    const actual = withTemporaryProject(
      "member-options-isolation-",
      {
        "src/api/index.ts": "export {};",
        "src/feature.spec.ts": [
          'import { Feature } from "./feature";',
          "new Feature().tested();",
        ].join("\n"),
        "src/feature.ts": source,
        "src/index.ts": "export {};",
        "src/public.ts": "export {};",
      },
      (root, program, resolvePath) => {
        const { config, linter } = createScopeLinter(root, program, {
          publicApiFiles: ["src/index.ts", "./src/index.ts", "src/public.ts"],
        });
        const filename = resolvePath("src/feature.ts");
        const first = linter.verify(source, config, filename);
        const testsCount = linter.verify(
          source,
          [
            ...config,
            {
              rules: {
                "codeperfect/no-unused-public-members": [
                  "error",
                  {
                    publicApiFiles: ["src/public.ts"],
                    testFilePatterns: ["never.ts"],
                  },
                ],
              },
            },
          ],
          filename,
        );
        const repeated = linter.verify(source, config, filename);
        return [first, testsCount, repeated].map((messages) =>
          messages.map((message) => message.messageId),
        );
      },
    );

    // Assert
    expect(actual).toStrictEqual([
      ["unusedPublicMember"],
      [],
      ["unusedPublicMember"],
    ]);
  });
});
