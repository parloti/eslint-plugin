import * as ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import { withTemporaryProject } from "../no-unused-exports/__tests__/no-unused-exports-utilities-test-helpers";
import { getOptions } from "../no-unused-exports/no-unused-exports-options";
import { canSourceReachMember } from "./member-api-reachability-utilities";
import { isPublicApiMember } from "./member-public-api-utilities";

describe("public API source reachability", () => {
  it("finds module dependencies when the source file has no cached imports", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "api-reachability-ast-",
      {
        "src/api.ts": [
          "import { Detail } from './detail';",
          "export { Detail as PublicDetail } from './barrel';",
          "import Required = require('./required');",
          "const dynamic = import('./dynamic');",
          "const common = require('./common');",
          "type Query = import('./query').Detail;",
          "const unrelated = './not-a-module';",
        ].join("\n"),
        "src/barrel.ts": "export type { Detail } from './detail';",
        "src/detail.ts": "export interface Detail { value: number }",
        "src/dynamic.ts": "export const dynamic = true;",
        "src/query.ts": "export interface Detail { value: number }",
        "src/required.ts": "export const required = true;",
      },
      (_, program, resolvePath) => {
        const checker = program.getTypeChecker();
        const detail = program.getSourceFile(resolvePath("src/detail.ts"));
        const api = program.getSourceFile(resolvePath("src/api.ts"));
        const declaration = detail?.statements.find((node) =>
          ts.isInterfaceDeclaration(node),
        );
        if (api === void 0 || declaration === void 0) {
          throw new Error("Missing AST reachability fixture");
        }
        const member = checker.getPropertyOfType(
          checker.getTypeAtLocation(declaration),
          "value",
        );
        if (member === void 0) {
          throw new Error("Missing AST reachability member");
        }

        Object.defineProperty(api, "imports", {
          configurable: true,
          value: void 0,
        });
        const getSymbolAtLocation = vi.spyOn(checker, "getSymbolAtLocation");
        const reachable = canSourceReachMember(api, member, program);
        const moduleSpecifiers = getSymbolAtLocation.mock.calls.map(([node]) =>
          ts.isStringLiteralLike(node) ? node.text : "",
        );

        return { moduleSpecifiers, reachable };
      },
    );

    // Assert
    expect(actual).toStrictEqual({
      moduleSpecifiers: [
        "./detail",
        "./barrel",
        "./required",
        "./dynamic",
        "./common",
        "./query",
        "./detail",
      ],
      reachable: true,
    });
  });

  it("follows imports, barrels, import types, and cycles without admitting unrelated packages", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "api-reachability-",
      {
        "src/barrel.ts": "export type { Detail } from './detail';",
        "src/cycle.ts": "export type Other = import('./other').Other;",
        "src/detail.ts": "export interface Detail { value: number }",
        "src/index.ts": "export type Payload = import('./barrel').Detail;",
        "src/other.ts": "export type Other = import('./cycle').Other;",
      },
      (_, program, resolvePath) => {
        const checker = program.getTypeChecker();
        const detail = program.getSourceFile(resolvePath("src/detail.ts"));
        const api = program.getSourceFile(resolvePath("src/index.ts"));
        const other = program.getSourceFile(resolvePath("src/other.ts"));
        if (detail === void 0 || api === void 0 || other === void 0) {
          throw new Error("Missing reachability fixture");
        }
        const declaration = detail.statements.find((node) =>
          ts.isInterfaceDeclaration(node),
        );
        if (declaration === void 0) {
          throw new Error("Missing Detail declaration");
        }
        const member = checker.getPropertyOfType(
          checker.getTypeAtLocation(declaration),
          "value",
        );
        if (member === void 0) {
          throw new Error("Missing Detail member");
        }
        return {
          api: canSourceReachMember(api, member, program),
          cachedApi: canSourceReachMember(api, member, program),
          other: canSourceReachMember(other, member, program),
          unknown: canSourceReachMember(
            other,
            { ...member, declarations: [] },
            program,
          ),
        };
      },
    );

    // Assert
    expect(actual).toStrictEqual({
      api: true,
      cachedApi: true,
      other: false,
      unknown: true,
    });
  });

  it("includes global declarations and triple-slash references", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "api-global-reachability-",
      {
        "src/detail.ts": "export interface Detail { value: number }",
        "src/global.ts": "interface GlobalDetail { value: number }",
        "src/index.ts": "/// <reference path='./detail.ts' />\nexport {};",
      },
      (_, program, resolvePath) => {
        const checker = program.getTypeChecker();
        const detail = program.getSourceFile(resolvePath("src/detail.ts"));
        const api = program.getSourceFile(resolvePath("src/index.ts"));
        if (detail === void 0 || api === void 0) {
          throw new Error("Missing global fixture");
        }
        const declaration = detail.statements.find((node) =>
          ts.isInterfaceDeclaration(node),
        );
        if (declaration === void 0) {
          throw new Error("Missing global declaration");
        }
        const member = checker.getPropertyOfType(
          checker.getTypeAtLocation(declaration),
          "value",
        );
        if (member === void 0) {
          throw new Error("Missing global member");
        }
        return canSourceReachMember(api, member, program);
      },
    );

    // Assert
    expect(actual).toBe(true);
  });

  it("preserves public exposure through external generics and global augmentations", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "api-generic-reachability-",
      {
        "node_modules/builder/index.d.ts":
          "export interface Builder<T> { build(): T[] }",
        "src/detail.ts": "export interface Detail { value: number }",
        "src/global.ts": [
          "import type { Detail } from './detail';",
          "declare global { interface GlobalPayload { detail: Detail } }",
        ].join("\n"),
        "src/index.ts": [
          "import type { Builder } from 'builder';",
          "import type { Detail } from './detail';",
          "export declare const schema: Builder<Detail>;",
        ].join("\n"),
        "src/other.ts": "export type Payload = GlobalPayload;",
      },
      (root, program, resolvePath) => {
        const checker = program.getTypeChecker();
        const detail = program.getSourceFile(resolvePath("src/detail.ts"));
        const other = program.getSourceFile(resolvePath("src/other.ts"));
        const declaration = detail?.statements[0];
        if (declaration === void 0 || other === void 0) {
          throw new Error("Missing generic fixture");
        }
        const member = checker.getPropertyOfType(
          checker.getTypeAtLocation(declaration),
          "value",
        );
        if (member === void 0) {
          throw new Error("Missing generic member");
        }
        return {
          generic: isPublicApiMember(program, getOptions([]), root, member),
          global: canSourceReachMember(other, member, program),
        };
      },
    );

    // Assert
    expect(actual).toStrictEqual({ generic: true, global: true });
  });

  it("does not expand unrelated generic exports while proving a member is not public", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "member-api-unreachable-",
      {
        "src/feature.ts": "export interface Internal { unused: number }",
        "src/generic.ts": [
          "interface Builder<T> { wrap(): Builder<Builder<T>>; value: T }",
          "export declare const schema: Builder<string>;",
        ].join("\n"),
        "src/index.ts": "export { schema } from './generic';",
      },
      (root, program, resolvePath) => {
        const checker = program.getTypeChecker();
        const source = program.getSourceFile(resolvePath("src/feature.ts"));
        const declaration = source?.statements[0];
        if (declaration === void 0) {
          throw new Error("Missing internal fixture");
        }
        const member = checker.getPropertyOfType(
          checker.getTypeAtLocation(declaration),
          "unused",
        );
        if (member === void 0) {
          throw new Error("Missing unused member");
        }
        const queries = vi.spyOn(checker, "getTypeOfSymbolAtLocation");
        const exposed = isPublicApiMember(
          program,
          getOptions([]),
          root,
          member,
        );
        return { exposed, queries: queries.mock.calls.length };
      },
    );

    // Assert
    expect(actual).toStrictEqual({ exposed: false, queries: 0 });
  });
});
