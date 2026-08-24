import { describe, expect, it } from "vitest";

import {
  collectPatternIdentifierNames,
  getExportSpecifierLocalName,
  getExportSpecifierName,
} from "./no-unused-exports-pattern-utilities";

describe("no-unused-exports pattern utilities", () => {
  it("returns no names for non-object patterns", () => {
    // Act
    const actualNames = collectPatternIdentifierNames("not-an-object");

    // Assert
    expect(actualNames).toStrictEqual([]);
  });

  it("returns no names for identifiers without names", () => {
    // Act
    const actualNames = collectPatternIdentifierNames({
      name: void 0,
      type: "Identifier",
    });

    // Assert
    expect(actualNames).toStrictEqual([]);
  });

  it("returns no names for array patterns without elements", () => {
    // Act
    const actualArrayNames = collectPatternIdentifierNames({
      type: "ArrayPattern",
    });

    // Assert
    expect(actualArrayNames).toStrictEqual([]);
  });

  it("returns no names for object patterns without properties", () => {
    // Act
    const actualObjectNames = collectPatternIdentifierNames({
      type: "ObjectPattern",
    });

    // Assert
    expect(actualObjectNames).toStrictEqual([]);
  });

  it("falls back to local specifier names when exported names are unreadable", () => {
    // Arrange
    const specifier = {
      exported: { type: "Literal", value: "literalAlias" },
      local: { name: "localValue", type: "Identifier" },
      type: "ExportSpecifier",
    };

    // Act
    const actualName = getExportSpecifierName(specifier);

    // Assert
    expect(actualName).toBe("localValue");
  });

  it("returns no exported specifier names when exported and local names are missing", () => {
    // Arrange
    const specifier = { type: "ExportSpecifier" };

    // Act
    const actualExportedName = getExportSpecifierName(specifier);

    // Assert
    expect(actualExportedName).toBeUndefined();
  });

  it("returns no local specifier names when exported and local names are missing", () => {
    // Arrange
    const specifier = { type: "ExportSpecifier" };

    // Act
    const actualLocalName = getExportSpecifierLocalName(specifier);

    // Assert
    expect(actualLocalName).toBeUndefined();
  });
});
