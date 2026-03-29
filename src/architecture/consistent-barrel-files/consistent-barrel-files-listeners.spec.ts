import type { Rule } from "eslint";

import { rmSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import { afterEach, describe, expect, it } from "vitest";

import { buildListenerForFile } from "./consistent-barrel-files-listeners";
import { getOptions } from "./consistent-barrel-files-options";
import { createRepoDirectory } from "./test-helpers";
import { writeFeature } from "./test-helpers.file-writers";

/** Captured program-listener state for one synthetic file. */
interface ProgramListenerState {
  /** Listener under test. */
  listener: Rule.RuleListener;

  /** Program node passed to the listener. */
  programNode: never;

  /** Reports captured from the ESLint context. */
  reports: Rule.ReportDescriptor[];
}

/**
 * Creates a primary-module listener and its captured report state.
 * @param temporaryDirectories Directories removed during teardown.
 * @returns Program listener state for the created fixture.
 * @example
 * ```typescript
 * const state = createPrimaryModuleState([]);
 * void state;
 * ```
 */
function createPrimaryModuleState(
  temporaryDirectories: string[],
): ProgramListenerState {
  const directory = createRepoDirectory("tmp");
  temporaryDirectories.push(directory);
  const filename = path.join(directory, "feature.ts");
  const reports: Rule.ReportDescriptor[] = [];
  const programNode = { type: "Program" } as never;

  writeFeature(filename);

  return {
    listener: buildListenerForFile(
      {
        report: (descriptor: Rule.ReportDescriptor): void => {
          reports.push(descriptor);
        },
      } as Rule.RuleContext,
      filename,
      getOptions([{}]),
    ),
    programNode,
    reports,
  };
}

/**
 * Runs the Program listener and returns the captured reports.
 * @param state Program-listener state under test.
 * @returns Reports emitted by the Program listener.
 * @example
 * ```typescript
 * const reports = executeProgramListener({ listener: {}, programNode: {} as never, reports: [] });
 * void reports;
 * ```
 */
function executeProgramListener(
  state: ProgramListenerState,
): Rule.ReportDescriptor[] {
  const programListener = state.listener.Program;

  programListener?.(state.programNode);

  return state.reports;
}

describe("consistent-barrel-files listeners", (): void => {
  const temporaryDirectories: string[] = [];

  afterEach((): void => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("returns no-op listener for non-lintable filenames", (): void => {
    // Arrange
    const options = [{}];

    // Act
    const listener = ((): Rule.RuleListener => {
      const state = getOptions(options);

      return buildListenerForFile({} as Rule.RuleContext, "relative.ts", state);
    })();

    // Assert
    expect(listener).toStrictEqual({});
  });

  it("returns no-op when another file owns the missing-barrel report", (): void => {
    // Arrange
    const filename = [cwd(), "src", "feature.ts"].join("/");
    const context = {
      report: (): void => {
        throw new Error("unexpected report");
      },
    } as unknown as Rule.RuleContext;
    const state = getOptions([{}]);

    // Act
    const listener = buildListenerForFile(context, filename, {
      ...state,
      allowedNames: ["index"],
      allowedNamesSet: new Set(["index"]),
      enforce: true,
    });

    // Assert
    expect(listener).toStrictEqual({});
  });

  it("reports missing barrels for the primary module file", (): void => {
    // Arrange
    const state = createPrimaryModuleState(temporaryDirectories);

    // Act
    const actual = executeProgramListener(state);

    // Assert
    expect(actual).toStrictEqual([
      {
        data: { names: "index" },
        messageId: "missingBarrel",
        node: state.programNode,
      },
    ]);
  });

  it("returns no-op for non-primary module files in the same directory", (): void => {
    // Arrange
    const directory = createRepoDirectory("tmp");
    temporaryDirectories.push(directory);
    const primaryFilename = path.join(directory, "alpha.ts");
    const secondaryFilename = path.join(directory, "beta.ts");
    writeFeature(primaryFilename);
    writeFeature(secondaryFilename);
    const context = {
      report: (): void => {
        throw new Error("unexpected report");
      },
    } as unknown as Rule.RuleContext;

    // Act
    const listener = buildListenerForFile(
      context,
      secondaryFilename,
      getOptions([{}]),
    );

    // Assert
    expect(listener).toStrictEqual({});
  });
});
