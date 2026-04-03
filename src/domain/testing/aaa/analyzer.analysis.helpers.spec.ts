import { describe, expect, it } from "vitest";

import {
  getFlattenedSections,
  getIndentationAtOffset,
  getLineStartRange,
  getPhaseBoundaryComments,
  getSectionPhases,
} from "./analyzer";
import { analyzerAnalysisHelpersCompanion } from "./analyzer.analysis.helpers";

describe("aAA analyzer analysis helpers", () => {
  it("exports the companion marker", () => {
    // Arrange
    const expected = true;

    // Act
    const actual = analyzerAnalysisHelpersCompanion;

    // Assert
    expect(actual).toBe(expected);
  });

  it("parses only valid AAA section comments", () => {
    // Arrange
    const blankComment = "   ";
    const invalidComment = "Arrange & Cleanup";
    const validComment = "Arrange & Assert";

    // Act
    const actual = {
      blank: getSectionPhases(blankComment),
      invalid: getSectionPhases(invalidComment),
      valid: getSectionPhases(validComment),
    };

    // Assert
    expect(actual.blank).toStrictEqual([]);
    expect(actual.invalid).toStrictEqual([]);
    expect(actual.valid).toStrictEqual(["Arrange", "Assert"]);
  });

  it("filters phase-boundary comments and resolves trailing line starts", () => {
    // Arrange
    const analysis = {
      sectionComments: [
        { phases: ["Arrange"] },
        { phases: ["Act"] },
        { phases: ["Arrange", "Assert"] },
      ],
    } as never;
    const sourceText = ["const first = 1;", "const second = 2;"].join("\n");

    // Act
    const actual = {
      boundaryComments: getPhaseBoundaryComments(analysis),
      lineStartRange: getLineStartRange(sourceText, 99),
    };

    // Assert
    expect(actual.boundaryComments).toHaveLength(2);
    expect(actual.lineStartRange).toStrictEqual([
      sourceText.length,
      sourceText.length,
    ]);
  });

  it("flattens section comments and resolves indentation", () => {
    // Arrange
    const analysis = {
      sectionComments: [
        { comment: { id: 1 }, phases: ["Arrange", "Act"] },
        { comment: { id: 2 }, phases: ["Assert"] },
      ],
    } as never;
    const sourceText = ["function demo() {", "    run();", "}"].join("\n");

    // Act
    const actual = {
      flattened: getFlattenedSections(analysis),
      indentation: getIndentationAtOffset(
        sourceText,
        sourceText.indexOf("run"),
      ),
    };

    // Assert
    expect(actual.flattened).toStrictEqual([
      { comment: { id: 1 }, phase: "Arrange" },
      { comment: { id: 1 }, phase: "Act" },
      { comment: { id: 2 }, phase: "Assert" },
    ]);
    expect(actual.indentation).toBe("    ");
  });
});
