import * as ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import { withTemporaryProject } from "../no-unused-exports/__tests__/no-unused-exports-utilities-test-helpers";
import { getOptions } from "../no-unused-exports/no-unused-exports-options";
import { hasTypeMember } from "./member-api-type-utilities";
import { isPublicApiMember } from "./member-public-api-utilities";

interface ExposureMeasurement {
  exposed: boolean;
  queries: number;
  repeatedQueries: number;
}

const createNestedApi = (
  wrap: (inner: string) => string,
  depth: number,
): string => {
  let nested = "Detail";
  for (let level = 0; level < depth; level++) {
    nested = wrap(nested);
  }
  return `interface Detail { downstream: number }\nexport type Api = ${nested};`;
};

const recursiveBuilder = [
  "interface Builder<T> {",
  "  value: T;",
  ...Array.from(
    { length: 8 },
    (_, index) =>
      `  branch${String(index)}: Builder<{ branch${String(index)}: T }>;`,
  ),
  "}",
  "interface Internal { unused: number }",
  "export declare const schema: Builder<unknown>;",
].join("\n");

const recursiveGenericApi = recursiveBuilder.replace(
  "export declare const schema: Builder<unknown>;",
  "export type Api<T> = Builder<T>;",
);

const measureExposure = (
  source: string,
  hostName: string,
  memberName: string,
): ExposureMeasurement =>
  withTemporaryProject(
    "api-type-query-",
    { "src/feature.ts": source, "src/index.ts": "export * from './feature';" },
    (root, program, resolvePath) => {
      const checker = program.getTypeChecker();
      const file = program.getSourceFile(resolvePath("src/feature.ts"));
      const declaration = file?.statements.find(
        (node) =>
          ts.isInterfaceDeclaration(node) && node.name.text === hostName,
      );
      if (declaration === void 0) {
        throw new Error("Missing API type-query host");
      }
      const member = checker.getPropertyOfType(
        checker.getTypeAtLocation(declaration),
        memberName,
      );
      if (member === void 0) {
        throw new Error("Missing API type-query member");
      }
      const original = checker.getTypeOfSymbolAtLocation.bind(checker);
      let queries = 0;
      vi.spyOn(checker, "getTypeOfSymbolAtLocation").mockImplementation(
        (symbol, location) => {
          queries++;
          if (queries > 150) {
            throw new Error("API query expanded unrelated recursive branches");
          }
          return original(symbol, location);
        },
      );
      const exposed = isPublicApiMember(program, getOptions([]), root, member);
      const firstQueries = queries;
      isPublicApiMember(program, getOptions([]), root, member);
      return {
        exposed,
        queries: firstQueries,
        repeatedQueries: queries - firstQueries,
      };
    },
  );

describe("candidate-directed API type queries", () => {
  it("finds a recursive builder member without expanding child instantiations", () => {
    // Arrange & Act
    const actual = measureExposure(recursiveBuilder, "Builder", "value");

    // Assert
    expect(actual.exposed).toBe(true);
    expect(actual.queries).toBeLessThan(5);
    expect(actual.repeatedQueries).toBe(0);
  });

  it("proves an unrelated member absent from a closed recursive generic", () => {
    // Arrange & Act
    const actual = measureExposure(recursiveBuilder, "Internal", "unused");

    // Assert
    expect(actual.exposed).toBe(false);
    expect(actual.queries).toBeLessThan(5);
    expect(actual.repeatedQueries).toBe(0);
  });

  it("does not instantiate recursive children of an unconstrained generic API", () => {
    // Arrange & Act
    const actual = measureExposure(recursiveGenericApi, "Internal", "unused");

    // Assert
    expect(actual.exposed).toBe(false);
    expect(actual.queries).toBeLessThan(5);
  });

  it("does not confuse phantom generic arguments with semantic exposure", () => {
    // Arrange
    const source = [
      "interface Detail { downstream: number }",
      "interface Phantom<T> { next: Phantom<T> }",
      "export type Api = Phantom<Detail>;",
    ].join("\n");

    // Act
    const actual = measureExposure(source, "Detail", "downstream");

    // Assert
    expect(actual.exposed).toBe(false);
    expect(actual.queries).toBeLessThan(5);
  });

  it.each([
    (inner: string) => `{ nested: ${inner} }`,
    (inner: string) => `{ [key: string]: ${inner} }`,
    (inner: string) => `(() => ${inner})`,
    (inner: string) => `((input: ${inner}) => void)`,
    (inner: string) => `{ new(): ${inner} }`,
  ])("preserves the existing nesting budget across edge types: %s", (wrap) => {
    // Arrange
    const boundary = createNestedApi(wrap, 6);
    const beyond = createNestedApi(wrap, 7);

    // Act
    const actual = [
      measureExposure(boundary, "Detail", "downstream").exposed,
      measureExposure(beyond, "Detail", "downstream").exposed,
    ];

    // Assert
    expect(actual).toStrictEqual([true, false]);
  });

  it.each([
    "export type Api = { new(input: Detail): { ready: boolean } };",
    "export type Api = { [key: string]: readonly [Detail] };",
    [
      "interface Box<T> { nested: { content: T } }",
      "export declare const api: Box<Detail>;",
    ].join("\n"),
    "export type Api<T extends Detail> = { nested: T };",
    [
      "declare function factory<T>(): { nested: T };",
      "export declare const api: ReturnType<typeof factory<Detail>>;",
    ].join("\n"),
    [
      "declare function factory<T>(): { nested: T };",
      "export const api = factory<Detail>;",
    ].join("\n"),
    [
      "function factory<T>() {",
      "  class Captured { nested!: T }",
      "  return new Captured();",
      "}",
      "export const api = factory<Detail>();",
    ].join("\n"),
    [
      "interface Shared { nested: Detail }",
      "export type Api = {",
      "  deep: { a: { b: { c: { d: { e: Shared } } } } };",
      "  shallow: Shared;",
      "};",
    ].join("\n"),
    [
      "interface Shared { nested: Detail }",
      "type Deep = { a: { b: { c: { d: { e: { f: Shared } } } } } };",
      "export declare const deep: Deep;",
      "export declare const shallow: Shared;",
    ].join("\n"),
    [
      "declare global { interface Number { [index: number]: Detail } }",
      "interface Box<T> { value: number }",
      "export declare const api: Box<unknown>;",
    ].join("\n"),
  ])("preserves nested exposure through %s", (shape) => {
    // Arrange
    const source = `interface Detail { downstream: number }\n${shape}`;

    // Act
    const actual = measureExposure(source, "Detail", "downstream");

    // Assert
    expect(actual.exposed).toBe(true);
    expect(actual.repeatedQueries).toBe(0);
  });

  it.each([true, false])(
    "reuses root and shared-subtype answers outside the export index: %s",
    (exposed) => {
      // Arrange & Act
      const actual = withTemporaryProject(
        "api-query-cache-",
        {
          "src/index.ts": [
            "interface Detail { downstream: number }",
            `type Api = { nested: ${exposed ? "Detail" : "number"} };`,
            `type OtherApi = { alternate: ${exposed ? "Detail" : "number"} };`,
            "export {};",
          ].join("\n"),
        },
        (_, program, resolvePath) => {
          const checker = program.getTypeChecker();
          const source = program.getSourceFile(resolvePath("src/index.ts"));
          const detail = source?.statements[0];
          const api = source?.statements[1];
          const otherApi = source?.statements[2];
          if (
            source === void 0 ||
            detail === void 0 ||
            api === void 0 ||
            otherApi === void 0
          ) {
            throw new Error("Missing cached API fixture");
          }
          const member = checker.getPropertyOfType(
            checker.getTypeAtLocation(detail),
            "downstream",
          );
          if (member === void 0) {
            throw new Error("Missing cached API member");
          }
          const type = checker.getTypeAtLocation(api);
          const otherType = checker.getTypeAtLocation(otherApi);
          const queries = vi.spyOn(checker, "getPropertyOfType");
          const first = hasTypeMember(type, member, program, source);
          const firstQueries = queries.mock.calls.length;
          const repeated = hasTypeMember(type, member, program, source);
          const repeatedQueries = queries.mock.calls.length - firstQueries;
          const other = hasTypeMember(otherType, member, program, source);
          return { first, other, repeated, repeatedQueries };
        },
      );

      // Assert
      expect(actual.first).toBe(exposed);
      expect(actual.other).toBe(exposed);
      expect(actual.repeated).toBe(exposed);
      expect(actual.repeatedQueries).toBe(exposed ? 1 : 0);
    },
  );
});
