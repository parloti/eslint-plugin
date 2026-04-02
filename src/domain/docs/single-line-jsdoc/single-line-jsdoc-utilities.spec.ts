import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { Comment } from "./single-line-jsdoc-content";

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
    reportIfSingleLine(
      context,
      {
        loc: { end: { column: 0, line: 3 }, start: { column: 0, line: 1 } },
        range: [0, 10],
        type: "Block",
        value: "*\n * ok\n ",
      } as Comment,
      80,
    );

    // Assert
    expect(reports).toHaveLength(1);
  });
});
