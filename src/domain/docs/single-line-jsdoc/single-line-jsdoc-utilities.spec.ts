import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import {
  normalizeMaxLineLength,
  reportIfSingleLine,
} from "./single-line-jsdoc-utilities";

describe("single-line-jsdoc utilities", () => {
  it("normalizes max line length", () => {
    // Arrange
    const configuredOptions = [{ maxLineLength: 10 }];

    // Act
    const result = {
      configuredMaxLineLength: normalizeMaxLineLength(configuredOptions),
      defaultMaxLineLength: normalizeMaxLineLength([]),
    };

    // Assert
    expect(result.defaultMaxLineLength).toBe(80);
    expect(result.configuredMaxLineLength).toBe(10);
  });

  it("reports when a multiline comment fits", () => {
    // Arrange
    const reports: Rule.ReportDescriptor[] = [];
    const context = {
      report: (descriptor: Rule.ReportDescriptor) => {
        reports.push(descriptor);
      },
    } as Rule.RuleContext;

    // Act
    const actualReports = (() => {
      reportIfSingleLine(
        context,
        {
          loc: { end: { column: 0, line: 3 }, start: { column: 0, line: 1 } },
          range: [0, 10],
          type: "Block",
          value: "*\n * ok\n ",
        },
        80,
      );

      return reports;
    })();

    // Assert
    expect(actualReports).toHaveLength(1);
  });

  it("defaults max line length for non-finite and non-positive values", () => {
    // Arrange
    const invalidValues = [
      [{ maxLineLength: NaN }],
      [{ maxLineLength: 0 }],
      [{ maxLineLength: -10 }],
    ];

    // Act
    const actualValues = invalidValues.map((options) =>
      normalizeMaxLineLength(options),
    );

    // Assert
    expect(actualValues).toStrictEqual([80, 80, 80]);
  });

  it("rounds down finite decimal max line length", () => {
    // Arrange
    const options = [{ maxLineLength: 10.9 }];

    // Act
    const actualMaxLineLength = normalizeMaxLineLength(options);

    // Assert
    expect(actualMaxLineLength).toBe(10);
  });

  it("skips comments that are not eligible for conversion", () => {
    // Arrange
    const reports: Rule.ReportDescriptor[] = [];
    const context = {
      report: (descriptor: Rule.ReportDescriptor) => {
        reports.push(descriptor);
      },
    } as Rule.RuleContext;

    // Act
    const actualReports = (() => {
      reportIfSingleLine(
        context,
        {
          loc: { end: { column: 0, line: 1 }, start: { column: 0, line: 1 } },
          range: [0, 10],
          type: "Line",
          value: " not jsdoc",
        } as never,
        80,
      );
      reportIfSingleLine(
        context,
        {
          loc: {
            end: { column: 0, line: 3 },
            start: { column: 79, line: 1 },
          },
          range: [0, 10],
          type: "Block",
          value:
            "*\n * this content is too long to fit the configured width\n ",
        },
        80,
      );
      reportIfSingleLine(
        context,
        {
          loc: void 0,
          range: [0, 10],
          type: "Block",
          value: "*\n * ok\n ",
        },
        80,
      );

      return reports;
    })();

    // Assert
    expect(actualReports).toHaveLength(0);
  });

  it("skips report when range metadata is missing", () => {
    // Arrange
    const reports: Rule.ReportDescriptor[] = [];
    const context = {
      report: (descriptor: Rule.ReportDescriptor) => {
        reports.push(descriptor);
      },
    } as Rule.RuleContext;

    // Act
    const actualReports = (() => {
      reportIfSingleLine(
        context,
        {
          loc: { end: { column: 0, line: 3 }, start: { column: 0, line: 1 } },
          range: void 0,
          type: "Block",
          value: "*\n * ok\n ",
        } as never,
        80,
      );

      return reports;
    })();

    // Assert
    expect(actualReports).toHaveLength(0);
  });
});
