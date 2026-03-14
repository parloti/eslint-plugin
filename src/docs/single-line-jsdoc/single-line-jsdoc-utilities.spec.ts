import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { Comment } from "./single-line-jsdoc-content";

import {
  normalizeMaxLineLength,
  reportIfSingleLine,
} from "./single-line-jsdoc-utilities";

describe("single-line-jsdoc utilities", () => {
  it("normalizes max line length", () => {
    expect(normalizeMaxLineLength([])).toBe(80);
    expect(normalizeMaxLineLength([{ maxLineLength: 10 }])).toBe(10);
  });

  it("reports when a multiline comment fits", () => {
    const reports: Rule.ReportDescriptor[] = [];
    const context = {
      report: (descriptor: Rule.ReportDescriptor) => {
        reports.push(descriptor);
      },
    } as Rule.RuleContext;
    const comment: Comment = {
      loc: { end: { column: 0, line: 3 }, start: { column: 0, line: 1 } },
      range: [0, 10],
      type: "Block",
      value: "*\n * ok\n ",
    } as Comment;

    reportIfSingleLine(context, comment, 80);

    expect(reports).toHaveLength(1);
  });
});
