import { describe, expect, it } from "vitest";

import { noUselessDelegationRule } from "../../src";
import { runRuleCase } from "../support";

describe("no-useless-delegation e2e", () => {
  it.each([
    [
      "an aliased imported function",
      [
        'import { runAllInOne as runAllInOneApplication } from "../application";',
        "",
        "export function runAllInOne(options: Options): Promise<void> {",
        "  return runAllInOneApplication(options);",
        "}",
      ].join("\n"),
    ],
    [
      "a member call",
      "const run = (options: Options) => application.run(options);",
    ],
    [
      "a zero-argument function",
      "function run(): void { return application.run(); }",
    ],
    [
      "a rest parameter",
      "const run = (...arguments_: unknown[]) => application.run(...arguments_);",
    ],
    [
      "a function expression",
      "const run = function (options: Options) { return application.run(options); };",
    ],
  ])("reports %s", (_description, code) => {
    // Arrange
    const expectedMessageId = "uselessDelegation";

    // Act
    const result = runRuleCase(
      "no-useless-delegation",
      noUselessDelegationRule,
      { code },
    );

    // Assert
    expect(result.messageIds).toStrictEqual([expectedMessageId]);
  });

  it.each([
    "const run = (options: Options) => application.run(normalize(options));",
    "const run = (first: string, second: string) => application.run(second, first);",
    "const run = (options: Options = defaults) => application.run(options);",
    "const run = ({ id }: Options) => application.run(id);",
    "const run = (options: Options) => { log(options); return application.run(options); };",
    "const run = async (options: Options) => application.run(options);",
    "const run = async (options: Options) => await application.run(options);",
    String.raw`function isExampleHeaderLine(line: string): boolean { return /^\s*\*?\s*@example\b/u.test(line); }`,
    String.raw`function isJSDocumentTagLine(line: string): boolean { return /^\s*\*?\s*@\w+\b/u.test(line); }`,
    "class Application { run(options: Options): unknown { return service.run(options); } }",
    "function run(options: Options): unknown { return run(options); }",
  ])("accepts %s", (code) => {
    // Act
    const result = runRuleCase(
      "no-useless-delegation",
      noUselessDelegationRule,
      { code },
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
