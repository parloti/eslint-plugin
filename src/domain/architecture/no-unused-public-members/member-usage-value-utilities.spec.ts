import { afterAll, describe, expect, it } from "vitest";

import { createTemporaryFixtureManager } from "../../../../tests/support";
import { createFixtureLintRunner } from "../../../../tests/support/no-unused-public-members-fixtures";

describe("no-unused-public-members value handoffs", () => {
  const fixtureManager = createTemporaryFixtureManager();
  const runFixtureLint = createFixtureLintRunner(fixtureManager);

  afterAll(() => {
    fixtureManager.cleanupTemporaryDirectories();
  });

  it("recognizes interface fields copied by an object spread", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "interface Status { message: string; ok: boolean; running: boolean }",
          "export function respond(status: Status) { return { action: 'start', ...status }; }",
          "export const unused = { dead: true };",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("recognizes variables passed to external calls without exempting excess fields or local calls", async () => {
    // Arrange
    const run = {
      files: {
        "src/external.d.ts": [
          'declare module "external" {',
          "  export function add(price: { high: number; low: number; close: number }): void;",
          "}",
        ].join("\n"),
        "src/feature.ts": [
          'import { add } from "external";',
          "export const price = { high: 3, low: 1, close: 2, dead: true };",
          "add(price);",
          "export const local = { ignored: true };",
          "function ignore(input: { ignored: boolean }) { void input; }",
          "ignore(local);",
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

  it("recognizes JSON serialization but does not treat arbitrary untyped calls as consumption", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "export const message = { kind: 'command', accountId: 'demo' };",
          "void JSON.stringify(message);",
          "declare function ignore(value: any): void;",
          "export const unused = { dead: true };",
          "ignore(unused);",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("does not count locally wrapped JSON serialization with a replacer", async () => {
    // Arrange
    const run = {
      files: {
        "src/consumer.ts": [
          'import type { Payload } from "./feature";',
          'import { payload } from "./feature";',
          "function serialize(value: Payload): string {",
          "  return JSON.stringify(value, []);",
          "}",
          "void serialize(payload);",
        ].join("\n"),
        "src/feature.ts": [
          "export interface Payload { token: string }",
          "export const payload: Payload = { token: 'hidden' };",
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

  it("does not exempt prototype methods, filtered serialization, or shadowed JSON calls", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "export class Model { unusedMethod(): void {} }",
          "void { ...new Model() };",
          "void JSON.stringify(new Model());",
          "export const filtered = { dead: true };",
          "void JSON.stringify(filtered, []);",
          "export const shadowed = { dead: true };",
          "function consume() {",
          "  const JSON = { stringify(value: unknown) { return ''; } };",
          "  return JSON.stringify(shadowed);",
          "}",
          "void consume();",
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
    ]);
  });

  it("does not exempt unrelated objects that have an identical shape", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "export const serialized = { value: 1 };",
          "export const copied = { value: 2 };",
          "export const unused = { value: 3 };",
          "void JSON.stringify(serialized);",
          "void { ...copied };",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("recognizes class fields and explicitly typed object members independently of prototype methods", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "export class Model { field = 1; }",
          "void { ...new Model() };",
          "interface Status { message: string }",
          "export const status: Status = { message: 'ready' };",
          "void { ...status };",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });

  it("recognizes const members serialized after a union annotation changes their property symbols", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "type Outcome = { status: 'pending' } | { status: 'unknown'; reason: string };",
          "export const outcome: Outcome = { status: 'unknown', reason: 'restart' };",
          "void JSON.stringify(outcome);",
          "export const copied: Outcome = { status: 'unknown', reason: 'copy' };",
          "void { ...copied };",
          "export const unused = { dead: true };",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("recognizes nested serialized contracts, union variants, and array elements", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "interface Detail { value: string }",
          "interface Pending { status: 'pending'; queuedAt: string }",
          "interface Complete { status: 'complete'; completedAt: string }",
          "interface Envelope { details: readonly Detail[]; state: Pending | Complete; next?: Envelope }",
          "declare const envelope: Envelope;",
          "void JSON.stringify(envelope);",
          "export const unused = { value: 'unrelated' };",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("does not treat shallow spreads or filtered serializers as reads of nested fields", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "interface Detail { value: string }",
          "declare const envelope: { detail: Detail };",
          "void { ...envelope };",
          "void JSON.stringify(envelope, []);",
        ].join("\n"),
      },
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("recognizes dictionary fields forwarded into external index-signature contracts", async () => {
    // Arrange
    const run = {
      files: {
        "src/external.d.ts": [
          "declare function send(options: { headers?: Record<string, string> | readonly [string, string][] }): void;",
        ].join("\n"),
        "src/feature.ts": [
          "export const headers: Record<string, string> = { 'x-request-id': 'request-1' };",
          "send({ headers });",
          "export const direct = { token: 'value' };",
          "declare function transmit(value: Record<string, string>): void;",
          "transmit(direct);",
          "function buildHeaders(): Record<string, string> {",
          "  const generated: Record<string, string> = { request: 'generated' };",
          "  return generated;",
          "}",
          "send({ headers: buildHeaders() });",
          "export const local = { unused: 'value' };",
          "function ignore(value: Record<string, string>) { void value; }",
          "ignore(local);",
          "export const incompatible = { unused: true };",
          "transmit(incompatible);",
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
