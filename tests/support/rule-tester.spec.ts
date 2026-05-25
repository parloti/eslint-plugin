import type { Rule } from "eslint";

import { RuleTester } from "@typescript-eslint/rule-tester";
import { describe, expect, it, vi } from "vitest";

/**
 *
 */
const demoRule: Rule.RuleModule = {
  create: () => ({}),
  meta: {
    messages: {
      match: "match",
    },
    schema: [],
    type: "problem",
  },
};

describe("rule-tester helpers", () => {
  it("registers the shared wrapper functions without focusing the suite", async () => {
    // Arrange
    const afterAllSpy = vi.fn();
    const describeSpy = vi.fn();
    const itSpy = vi.fn();
    const itOnlySpy = vi.fn();

    vi.doMock(
      import("vitest"),
      () =>
        ({
          afterAll: afterAllSpy,
          describe: describeSpy,
          it: Object.assign(itSpy, { only: itOnlySpy }),
        }) as unknown as Partial<typeof import("vitest")>,
    );

    await import("./rule-tester");

    // Act
    RuleTester.afterAll(() => void 0);
    RuleTester.describe("demo", () => void 0);
    RuleTester.it("demo", () => void 0);
    RuleTester.itOnly("demo", () => void 0);

    // Assert
    expect(afterAllSpy).toHaveBeenCalledTimes(1);
    expect(describeSpy).toHaveBeenCalledTimes(1);
    expect(itSpy).toHaveBeenCalledTimes(1);
    expect(itOnlySpy).toHaveBeenCalledTimes(1);
  });

  it("creates a RuleTester with the project parser and delegates run calls", async () => {
    // Arrange
    const runSpy = vi
      .spyOn(RuleTester.prototype, "run")
      .mockImplementation(() => void 0);
    vi.doMock(
      import("vitest"),
      () =>
        ({
          afterAll: vi.fn(),
          describe: vi.fn(),
          it: Object.assign(vi.fn(), { only: vi.fn() }),
        }) as unknown as Partial<typeof import("vitest")>,
    );

    const { createRuleTester } = await import("./rule-tester");
    const ruleTester = createRuleTester();
    const tests = {
      invalid: [],
      valid: [],
    };

    // Act
    ruleTester.run("demo-rule", demoRule, tests);

    // Assert
    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(runSpy).toHaveBeenCalledWith("demo-rule", demoRule, tests);
  });

  it("defines plain and temporary-fixture RuleTester suites", async () => {
    // Arrange
    const runSpy = vi
      .spyOn(RuleTester.prototype, "run")
      .mockImplementation(() => void 0);

    vi.doMock(
      import("vitest"),
      () =>
        ({
          afterAll: vi.fn(),
          describe: vi.fn(),
          it: Object.assign(vi.fn(), { only: vi.fn() }),
        }) as unknown as Partial<typeof import("vitest")>,
    );

    const { defineRuleTesterSuite, defineTemporaryFixtureRuleTesterSuite } =
      await import("./rule-tester");

    // Act
    defineRuleTesterSuite("demo-rule", demoRule, {
      invalid: [],
      valid: [],
    });
    defineTemporaryFixtureRuleTesterSuite(
      "fixture-rule",
      demoRule,
      (fixtureManager) => {
        const fixtureSet = fixtureManager.createFixtureSet({
          "feature.ts": "export const feature = 1;",
        });

        expect(fixtureSet.getFilePath("feature.ts")).toContain("feature.ts");

        return {
          invalid: [],
          valid: [],
        };
      },
    );

    // Assert
    expect(runSpy).toHaveBeenCalledTimes(2);
  });
});
