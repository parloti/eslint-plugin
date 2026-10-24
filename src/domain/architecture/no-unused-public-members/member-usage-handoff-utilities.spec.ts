import { afterAll, describe, expect, it } from "vitest";

import { createTemporaryFixtureManager } from "../../../../tests/support";
import { createFixtureLintRunner } from "../../../../tests/support/no-unused-public-members-fixtures";

describe("no-unused-public-members value handoffs", () => {
  const fixtureManager = createTemporaryFixtureManager();
  const runFixtureLint = createFixtureLintRunner(fixtureManager);

  afterAll(() => {
    fixtureManager.cleanupTemporaryDirectories();
  });

  it("recognizes nested values sent through opaque contracts and local serializers", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import { metrics, payload, ignored } from "./feature";',
          "interface Publisher {",
          "  publish(event: { payload: unknown }): void;",
          "  json(body: unknown): void;",
          "  ignore(value: unknown): void;",
          "  request(method: string, url: string, options: { body?: any }): void;",
          "}",
          "declare const publisher: Publisher;",
          "publisher.publish({ payload: metrics });",
          "publisher.json([metrics]);",
          'publisher.request("POST", "/", { body: payload });',
          "publisher.ignore(ignored);",
          "function sendResult(message: { payload: unknown }): void {",
          "  const { payload: nested, ...rest } = message;",
          "  const envelope = { ...rest, payload: nested };",
          "  void JSON.stringify(envelope);",
          "}",
          "sendResult({ payload });",
          "function ignore(message: { payload: unknown }): void {",
          "  void message;",
          "  void JSON.stringify({ unrelated: true });",
          "}",
          "ignore({ payload: ignored });",
        ].join("\n"),
        "src/feature.ts": [
          "export const metrics = { winCount: 1, winRate: 0.5 };",
          'export const payload = { accountId: "demo", status: "accepted" };',
          "export const ignored = { dead: true };",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("recognizes values forwarded through local calls to HTTP request bodies", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import { http } from "http-client";',
          'import { ignored, payload } from "./feature";',
          "function sendRequest(body: unknown): void {",
          '  http.request("POST", "/", { body });',
          "}",
          "function createAccount(input: { label: string }): void {",
          "  sendRequest(input);",
          "}",
          "function storeCreateAccount(input: { label: string }): void {",
          "  createAccount(input);",
          "}",
          "storeCreateAccount(payload);",
          "function ignore(input: { dead: boolean }): void { void input; }",
          "ignore(ignored);",
        ].join("\n"),
        "src/feature.ts": [
          "export const payload = { label: 'demo' };",
          "export const ignored = { dead: true };",
        ].join("\n"),
        "src/http.d.ts": [
          'declare module "http-client" {',
          "  export interface HttpClient {",
          "    request(method: string, url: string, options: { body?: any }): void;",
          "  }",
          "  export const http: HttpClient;",
          "}",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("recognizes local request bodies passed to class method declarations", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import { http } from "http-client";',
          'import { ignored, payload } from "./feature";',
          "function run(callback: () => void): void {",
          "  callback();",
          "}",
          "function sendRequest(body: unknown): void {",
          '  http.request("POST", "/", { body });',
          "}",
          "function createAccount(input: { label: string }): void {",
          "  run(() => sendRequest(input));",
          "}",
          "createAccount(payload);",
          "function ignore(input: { dead: boolean }): void { void input; }",
          "ignore(ignored);",
        ].join("\n"),
        "src/feature.ts": [
          "export const payload = { label: 'demo' };",
          "export const ignored = { dead: true };",
        ].join("\n"),
        "src/http.d.ts": [
          'declare module "http-client" {',
          "  export abstract class HttpClient {",
          "    request(method: string, url: string, options: { body?: unknown } | undefined): void;",
          "  }",
          "  export const http: HttpClient;",
          "}",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("recognizes typed view members sent through local response methods", async () => {
    // Arrange
    const run = {
      files: {
        "src/index.ts": [
          'export type { Execution, View } from "./view-types";',
        ].join("\n"),
        "src/registry.ts": [
          'import type { View } from "./index";',
          "export interface Registry { list(): readonly View[] | undefined }",
        ].join("\n"),
        "src/response.ts": [
          'import type { Registry } from "./registry";',
          "interface HttpResponse { status(code: number): HttpResponse; json: (value: unknown) => void }",
          "declare const registry: Registry;",
          "declare const response: HttpResponse;",
          "const views = registry.list();",
          "if (views === undefined) throw new Error('missing');",
          "response.status(200).json(views);",
        ].join("\n"),
        "src/view-types.ts": [
          "export interface Execution { orderId?: string; outcome?: string }",
          "export interface View { createdAt: string; execution?: Execution }",
        ].join("\n"),
      },
      targetRelativePath: "src/view-types.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });

  it("terminates recursive searches without consuming method returns or nested function returns", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "interface Detail { value: string }",
          "interface Recursive { next?: Recursive; build(): Detail }",
          "declare const recursive: Recursive;",
          "void JSON.stringify(recursive);",
          "export const unused = { hidden: true };",
          "function factory(): object { function nested() { return unused; } return {}; }",
          "function cycle(): object { return cycle(); }",
          "void JSON.stringify(factory());",
          "void JSON.stringify(cycle());",
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
});
