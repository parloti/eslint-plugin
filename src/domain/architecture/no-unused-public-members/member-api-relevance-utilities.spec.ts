import { describe, expect, it } from "vitest";

import { withTemporaryProject } from "../no-unused-exports/__tests__/no-unused-exports-utilities-test-helpers";
import { canTypeContainMember } from "./member-api-relevance-utilities";

const queryRelevance = (shape: string): boolean =>
  withTemporaryProject(
    "api-type-relevance-",
    {
      "src/feature.ts": ["interface Detail { downstream: number }", shape].join(
        "\n",
      ),
    },
    (_, program, resolvePath) => {
      const checker = program.getTypeChecker();
      const source = program.getSourceFile(resolvePath("src/feature.ts"));
      const declaration = source?.statements[0];
      const module =
        source === void 0 ? void 0 : checker.getSymbolAtLocation(source);
      if (declaration === void 0 || module === void 0 || source === void 0) {
        throw new Error("Missing API relevance fixture");
      }
      const member = checker.getPropertyOfType(
        checker.getTypeAtLocation(declaration),
        "downstream",
      );
      const exported = checker
        .getExportsOfModule(module)
        .find((symbol) => symbol.getName() === "api");
      if (member === void 0 || exported === void 0) {
        throw new Error("Missing API relevance symbols");
      }
      return canTypeContainMember(
        checker.getTypeOfSymbolAtLocation(exported, source),
        member,
        program,
      );
    },
  );

describe("conservative API branch relevance", () => {
  it.each([
    "any",
    "unknown",
    "never",
    "void",
    "undefined",
    "null",
    "number",
    "string",
    "string | number",
  ])("excludes closed recursive generic branches carrying %s", (argument) => {
    // Arrange
    const source = [
      "interface Builder<T> { value: T; next: Builder<{ nested: T }> }",
      `export declare const api: Builder<${argument}>;`,
    ].join("\n");

    // Act
    const actual = queryRelevance(source);

    // Assert
    expect(actual).toBe(false);
  });

  it.each(
    [
      [
        "interface Box<T> { nested: { content: T } }",
        "export declare const api: Box<readonly [Detail] | undefined>;",
      ],
      [
        "function factory<T>() { class Captured { nested!: T }",
        "return new Captured(); }",
        "export const api = factory<Detail>();",
      ],
      [
        "declare function factory<T>(): { nested: T };",
        "export const api = factory<Detail>;",
      ],
      [
        "declare global { interface Number { [index: number]: Detail } }",
        "interface Box<T> { value: number }",
        "export declare const api: Box<unknown>;",
      ],
      [
        "const value: Detail = { downstream: 1 };",
        "interface Box<T> { value: typeof value }",
        "export declare const api: Box<unknown>;",
      ],
    ].map((lines) => lines.join("\n")),
  )(
    "retains potentially relevant substitutions and inference: %s",
    (source) => {
      // Arrange & Act
      const actual = queryRelevance(source);

      // Assert
      expect(actual).toBe(true);
    },
  );
});
