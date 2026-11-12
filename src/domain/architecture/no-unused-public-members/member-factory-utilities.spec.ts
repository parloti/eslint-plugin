import * as ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import { withTemporaryProject } from "../no-unused-exports/__tests__/no-unused-exports-utilities-test-helpers";
import { createScopeLinter } from "./__tests__";

const FACTORY_DECLARATIONS = Array.from(
  { length: 20 },
  (_, index) =>
    `function make${String(index)}(): object { return make${String((index + 1) % 20)}(); }`,
);
const FACTORY_CONSUMERS = Array.from(
  { length: 20 },
  (_, index) => `JSON.stringify(make${String(index)}());`,
);

describe("local factory summaries", () => {
  it("reuses completed negative recursive returns across factory entry points", () => {
    // Arrange
    const source = `export interface Feature { ${Array.from(
      { length: 20 },
      (_, index) => `field${String(index)}: number;`,
    ).join(" ")} }`;

    // Act
    const actual = withTemporaryProject(
      "member-negative-factories-",
      {
        "src/factories.ts": [
          ...FACTORY_DECLARATIONS,
          ...FACTORY_CONSUMERS,
        ].join("\n"),
        "src/feature.ts": source,
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
          factoryQueries: symbols.mock.calls.filter(
            ([node]) =>
              ts.isCallExpression(node) && node.getText().startsWith("make"),
          ).length,
          messages: messages.map((message) => message.messageId),
        };
      },
    );

    // Assert
    expect(actual.messages).toStrictEqual(
      Array.from({ length: 20 }, () => "unusedPublicMember"),
    );
    expect(actual.factoryQueries).toBeGreaterThan(0);
    expect(actual.factoryQueries).toBeLessThan(1200);
  });

  it("preserves recursive and concise factory exits while excluding nested returns", () => {
    // Arrange
    const source =
      "export class Used { live = 1 } export class ArrowUsed { arrowLive = 1 } export class Dead { unused = 1 }";

    // Act
    const actual = withTemporaryProject(
      "member-recursive-factory-exit-",
      {
        "src/factories.ts": [
          "import { Used, ArrowUsed, Dead } from './feature';",
          "declare const stop: boolean;",
          "function first(): object { if (stop) return second(); return new Used(); }",
          "function second(): object { return first(); }",
          "function unrelated(): object { function nested(): object { return new Dead(); } void nested; return {}; }",
          "const concise = (): object => new ArrowUsed();",
          "JSON.stringify(first()); JSON.stringify(second()); JSON.stringify(unrelated()); JSON.stringify(concise());",
        ].join("\n"),
        "src/feature.ts": source,
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
  });
});
