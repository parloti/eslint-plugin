import type { Rule } from "eslint";

import { RuleTester } from "@typescript-eslint/rule-tester";
import { describe, expect, it, vi } from "vitest";

/** Demo rule used by helper-level RuleTester assertions. */
const demoRule: Rule.RuleModule = {
  create: () => ({}),
  meta: { messages: { match: "match" }, schema: [], type: "problem" },
};

/** Optional overrides used by the mocked `vitest` module factory. */
interface VitestModuleMockOverrides {
  /** Optional override for `afterAll`. */
  afterAll?: ReturnType<typeof vi.fn>;

  /** Optional override for `describe`. */
  describe?: ReturnType<typeof vi.fn>;

  /** Optional override for `it`. */
  it?: ReturnType<typeof vi.fn>;

  /** Optional override for `it.only`. */
  itOnly?: ReturnType<typeof vi.fn>;
}

/**
 * Builds a partial Vitest module mock with deterministic spy functions.
 * @param overrides Spy overrides for selected Vitest exports.
 * @returns Partially mocked Vitest module.
 * @example
 * ```typescript
 * const mockedVitest = createVitestModuleMock({ it: vi.fn() });
 * ```
 */
const createVitestModuleMock = (overrides: VitestModuleMockOverrides) => {
  const afterAllMock = overrides.afterAll ?? vi.fn();
  const describeMock = overrides.describe ?? vi.fn();
  const itMock = overrides.it ?? vi.fn();
  const itOnlyMock = overrides.itOnly ?? vi.fn();

  return {
    afterAll: afterAllMock,
    describe: describeMock,
    it: Object.assign(itMock, { only: itOnlyMock }),
  } as unknown as Partial<typeof import("vitest")>;
};

/**
 * Returns `undefined` and performs no work.
 * @returns Always `undefined`.
 * @example
 * ```typescript
 * const result = noOperation();
 * ```
 */
const noOperation = (): undefined => undefined;

describe("rule-tester helpers", () => {
  it("registers the shared wrapper functions without focusing the suite", async () => {
    // Arrange
    const afterAllSpy = vi.fn();
    const describeSpy = vi.fn();
    const itSpy = vi.fn();
    const itOnlySpy = vi.fn();

    vi.doMock(import("vitest"), () =>
      createVitestModuleMock({
        afterAll: afterAllSpy,
        describe: describeSpy,
        it: itSpy,
        itOnly: itOnlySpy,
      }),
    );

    // Act
    const actual = await (async () => {
      const importResult = await import("./rule-tester");
      RuleTester.afterAll(noOperation);
      RuleTester.describe("demo", noOperation);
      RuleTester.itOnly("demo", noOperation);
      RuleTester.it("demo", noOperation);

      return {
        importResult,
        wrapperResults: {
          afterAllResult: undefined,
          describeResult: undefined,
          itOnlyResult: undefined,
          itResult: undefined,
        },
      };
    })();

    // Assert
    expect(actual.wrapperResults).toStrictEqual({
      afterAllResult: undefined,
      describeResult: undefined,
      itOnlyResult: undefined,
      itResult: undefined,
    });
    expect(actual.importResult).toBeDefined();
    expect({
      afterAll: afterAllSpy.mock.calls.length,
      describe: describeSpy.mock.calls.length,
      it: itSpy.mock.calls.length,
      itOnly: itOnlySpy.mock.calls.length,
    }).toStrictEqual({ afterAll: 1, describe: 1, it: 1, itOnly: 1 });
  });

  it("creates a RuleTester with the project parser and delegates run calls", async () => {
    // Arrange
    const runSpy = vi
      .spyOn(RuleTester.prototype, "run")
      .mockImplementation(() => {
        noOperation();
      });
    vi.doMock(import("vitest"), () => createVitestModuleMock({}));

    const tests = { invalid: [], valid: [] };

    // Act
    const actual = await (async () => {
      const ruleTesterModule = await import("./rule-tester");
      const ruleTester = ruleTesterModule.createRuleTester();
      ruleTester.run("demo-rule", demoRule, tests);

      return {};
    })();

    // Assert
    expect(actual).toStrictEqual({});
    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(runSpy).toHaveBeenCalledWith("demo-rule", demoRule, tests);
  });

  it("defines plain and temporary-fixture RuleTester suites", async () => {
    // Arrange
    const runSpy = vi
      .spyOn(RuleTester.prototype, "run")
      .mockImplementation(() => {
        noOperation();
      });

    vi.doMock(import("vitest"), () => createVitestModuleMock({}));

    // Act
    const actual = await (async () => {
      let generatedFixturePath = "";
      const suites = await import("./rule-tester");
      suites.defineRuleTesterSuite("demo-rule", demoRule, {
        invalid: [],
        valid: [],
      });
      suites.defineTemporaryFixtureRuleTesterSuite(
        "fixture-rule",
        demoRule,
        (fixtureManager) => {
          const fixtureSet = fixtureManager.createFixtureSet({
            "feature.ts": "export const feature = 1;",
          });
          generatedFixturePath = fixtureSet.getFilePath("feature.ts");

          return { invalid: [], valid: [] };
        },
      );

      return { generatedFixturePath };
    })();

    // Assert
    expect(actual.generatedFixturePath).toContain("feature.ts");
    expect(runSpy).toHaveBeenCalledTimes(2);
  });
});
