import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  benchmarkCases,
  formatBenchmarkSummary,
  main,
  runBenchmark,
  runBenchmarks,
} from "./benchmark-rules";

/** Supported benchmark rule names. */
type BenchmarkRuleName = (typeof benchmarkCases)[number]["ruleName"];

/**
 * Imports the benchmark module as if it were the CLI entry point.
 * @returns Return value output.
 * @example
 * ```typescript
 * await importCliEntry();
 * ```
 */
const importCliEntry = async (): Promise<void> => {
  const currentPath = fileURLToPath(
    new URL("benchmark-rules.ts", import.meta.url),
  );
  const originalArgv = process.argv;
  const originalIterations = process.env["BENCHMARK_RULE_ITERATIONS"];

  process.argv = [originalArgv[0] ?? "node", currentPath];
  process.env["BENCHMARK_RULE_ITERATIONS"] = "1";

  const moduleUrl = new URL("benchmark-rules.ts?cli-entry=1", import.meta.url)
    .href;

  await import(moduleUrl);

  process.env["BENCHMARK_RULE_ITERATIONS"] = originalIterations;
  process.argv = originalArgv;
};

/**
 * Imports the benchmark module as the CLI entry point with an invalid
 * iteration value.
 * @returns Return value output.
 * @example
 * ```typescript
 * await importInvalidCliEntry();
 * ```
 */
const importInvalidCliEntry = async (): Promise<void> => {
  const currentPath = fileURLToPath(
    new URL("benchmark-rules.ts", import.meta.url),
  );
  const originalArgv = process.argv;
  const originalIterations = process.env["BENCHMARK_RULE_ITERATIONS"];

  process.argv = [originalArgv[0] ?? "node", currentPath];
  process.env["BENCHMARK_RULE_ITERATIONS"] = "0";

  const moduleUrl = new URL(
    "benchmark-rules.ts?cli-entry=invalid",
    import.meta.url,
  ).href;

  await import(moduleUrl);

  process.env["BENCHMARK_RULE_ITERATIONS"] = originalIterations;
  process.argv = originalArgv;
};

describe("benchmark rules", () => {
  it("defines benchmark coverage for the heavier custom rules", () => {
    expect(
      benchmarkCases.map(
        (benchmarkCase: (typeof benchmarkCases)[number]) =>
          benchmarkCase.ruleName,
      ),
    ).toStrictEqual([
      "prefer-interface-types",
      "require-example-language",
      "prefer-vi-mocked-import",
      "consistent-barrel-files",
    ]);
  });

  it("formats benchmark summaries", () => {
    expect(
      formatBenchmarkSummary({
        elapsedMilliseconds: 10,
        iterations: 2,
        ruleName: "prefer-interface-types",
      }),
    ).toBe("prefer-interface-types: 10ms total for 2 iterations");
  });

  it("runs a benchmark case", () => {
    const summary = runBenchmark(
      benchmarkCases[0] as (typeof benchmarkCases)[number],
      1,
    );

    expect(summary.ruleName).toBe("prefer-interface-types");
    expect(summary.iterations).toBe(1);
    expect(summary.elapsedMilliseconds).toBeGreaterThanOrEqual(0);
  });

  it("rejects unsupported benchmark rules", () => {
    expect(() =>
      runBenchmark(
        {
          code: "export const value = 1;",
          filename: "src/value.ts",
          ruleName: "unsupported-rule" as BenchmarkRuleName,
        },
        1,
      ),
    ).toThrowError("Unsupported benchmark rule: unsupported-rule");
  });

  it("runs all benchmark cases with an override", () => {
    expect(
      runBenchmarks(1).map(
        (summary: ReturnType<typeof runBenchmark>) => summary.ruleName,
      ),
    ).toStrictEqual([
      "prefer-interface-types",
      "require-example-language",
      "prefer-vi-mocked-import",
      "consistent-barrel-files",
    ]);
  });

  it("prints benchmark summaries", () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    main(1);

    expect(stdoutSpy).toHaveBeenCalledTimes(4);

    stdoutSpy.mockRestore();
  });

  it("runs automatically when imported as the CLI entry", async () => {
    vi.resetModules();

    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    await importCliEntry();

    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining("iterations"),
    );

    stdoutSpy.mockRestore();
  }, 20_000);

  it("falls back to the default iteration count for invalid CLI values", async () => {
    vi.resetModules();

    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    await importInvalidCliEntry();

    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining("25 iterations"),
    );

    stdoutSpy.mockRestore();
  }, 40_000);
});
