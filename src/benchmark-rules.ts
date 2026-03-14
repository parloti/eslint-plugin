import type { Rule } from "eslint";

import { Linter } from "eslint";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { parser } from "typescript-eslint";

import {
  consistentBarrelFilesRule,
  preferInterfaceTypesRule,
  preferViMockedImportRule,
  requireExampleLanguageRule,
} from "./rules";

/** Shape of a benchmark case. */
interface BenchmarkCase {
  /** Source code passed to ESLint. */
  code: string;

  /** Filename used for the lint run. */
  filename: string;

  /** Rule id inside the internal plugin. */
  ruleName: string;
}

/** Summary returned by a benchmark run. */
interface BenchmarkSummary {
  /** Elapsed milliseconds across all iterations. */
  elapsedMilliseconds: number;

  /** Iteration count used by the run. */
  iterations: number;

  /** Rule name under test. */
  ruleName: string;
}

/** Iteration count for each benchmark case. */
const iterations = 25;

/** Shared TypeScript language options for benchmark runs. */
const languageOptions = {
  ecmaVersion: 2022,
  parser,
  sourceType: "module",
} as const;

/** Benchmark cases covering the heavier package-owned rules. */
const benchmarkCases = [
  {
    code: Array.from({ length: 200 }, (_unused, index) => {
      return `export interface Feature${index} { value: string }`;
    }).join("\n"),
    filename: "src/features.ts",
    ruleName: "prefer-interface-types",
  },
  {
    code: Array.from({ length: 150 }, (_unused, index) => {
      return [
        "/**",
        ` * @example feature${index}()`,
        " * ```typescript",
        ` * feature${index}();`,
        " * ```",
        " */",
        `export function feature${index}(): void {}`,
      ].join("\n");
    }).join("\n"),
    filename: "src/docs.ts",
    ruleName: "require-example-language",
  },
  {
    code: Array.from({ length: 100 }, (_unused, index) => {
      return [
        `const mockedFeature${index} = vi.fn();`,
        `vi.mock("./feature-${index}", () => ({ feature${index}: mockedFeature${index} }));`,
      ].join("\n");
    }).join("\n"),
    filename: "src/example.spec.ts",
    ruleName: "prefer-vi-mocked-import",
  },
  {
    code: Array.from({ length: 150 }, (_unused, index) => {
      return `export * from "./feature-${index}";`;
    }).join("\n"),
    filename: "src/index.ts",
    ruleName: "consistent-barrel-files",
  },
] as const satisfies readonly [BenchmarkCase, ...BenchmarkCase[]];

/**
 * Formats a benchmark summary for console output.
 * @param summary Summary to format.
 * @returns Return value output.
 * @example
 * ```typescript
 * const line = formatBenchmarkSummary({
 *   elapsedMilliseconds: 10,
 *   iterations: 1,
 *   ruleName: "prefer-interface-types",
 * });
 * ```
 */
function formatBenchmarkSummary(summary: BenchmarkSummary): string {
  return `${summary.ruleName}: ${summary.elapsedMilliseconds}ms total for ${summary.iterations} iterations`;
}

/**
 * Resolves the rule module used for a benchmark case.
 * @param ruleName Internal rule name.
 * @returns Return value output.
 * @throws {TypeError} When the benchmark case references an unsupported rule.
 * @example
 * ```typescript
 * const rule = getRuleModule("prefer-interface-types");
 * ```
 */
function getRuleModule(ruleName: BenchmarkCase["ruleName"]): Rule.RuleModule {
  switch (ruleName) {
    case "consistent-barrel-files": {
      return consistentBarrelFilesRule;
    }
    case "prefer-interface-types": {
      return preferInterfaceTypesRule;
    }
    case "prefer-vi-mocked-import": {
      return preferViMockedImportRule;
    }
    case "require-example-language": {
      return requireExampleLanguageRule;
    }
    default: {
      throw new TypeError(`Unsupported benchmark rule: ${ruleName}`);
    }
  }
}

/**
 * Runs the benchmark command and prints each summary.
 * @param iterationsOverride Optional iteration count used by the run.
 * @example
 * ```typescript
 * main(1);
 * ```
 */
function main(iterationsOverride = iterations): void {
  for (const summary of runBenchmarks(iterationsOverride)) {
    process.stdout.write(`${formatBenchmarkSummary(summary)}\n`);
  }
}

/**
 * Runs a benchmark case and returns the elapsed milliseconds.
 * @param benchmarkCase Benchmark definition.
 * @param iterationsOverride Optional iteration count used by the run.
 * @returns Return value output.
 * @example
 * ```typescript
 * const summary = runBenchmark(benchmarkCases[0], 1);
 * ```
 */
function runBenchmark(
  benchmarkCase: BenchmarkCase,
  iterationsOverride = iterations,
): BenchmarkSummary {
  const linter = new Linter({ configType: "flat" });
  const pluginRules = Object.fromEntries([
    [benchmarkCase.ruleName, getRuleModule(benchmarkCase.ruleName)],
  ]) as Record<string, Rule.RuleModule>;
  const start = performance.now();

  for (let iteration = 0; iteration < iterationsOverride; iteration += 1) {
    void linter.verify(
      benchmarkCase.code,
      [
        {
          files: ["**/*.ts"],
          languageOptions,
          plugins: {
            codeperfect: {
              rules: pluginRules,
            },
          },
          rules: {
            [`codeperfect/${benchmarkCase.ruleName}`]: "error",
          },
        },
      ],
      benchmarkCase.filename,
    );
  }

  return {
    elapsedMilliseconds: Number((performance.now() - start).toFixed(2)),
    iterations: iterationsOverride,
    ruleName: benchmarkCase.ruleName,
  };
}

/**
 * Runs all benchmark cases and returns their summaries.
 * @param iterationsOverride Optional iteration count used by the run.
 * @returns Return value output.
 * @example
 * ```typescript
 * const summaries = runBenchmarks(1);
 * ```
 */
function runBenchmarks(iterationsOverride = iterations): BenchmarkSummary[] {
  return benchmarkCases.map((benchmarkCase) =>
    runBenchmark(benchmarkCase, iterationsOverride),
  );
}

/** Current CLI entry file when invoked from the terminal. */
const [, currentEntry] = process.argv;

/** Iteration count used by the CLI entry point. */
const cliIterations = Number(
  process.env["BENCHMARK_RULE_ITERATIONS"] ?? iterations,
);

if (
  currentEntry !== void 0 &&
  import.meta.url === pathToFileURL(currentEntry).href
) {
  main(
    Number.isNaN(cliIterations) || cliIterations < 1
      ? iterations
      : cliIterations,
  );
}

export {
  benchmarkCases,
  formatBenchmarkSummary,
  main,
  runBenchmark,
  runBenchmarks,
};
export type { BenchmarkCase, BenchmarkSummary };
