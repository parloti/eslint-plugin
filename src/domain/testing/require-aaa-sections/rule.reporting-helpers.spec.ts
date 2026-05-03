import { describe, expect, it } from "vitest";

import {
  getMockSectionComments,
  getMockStatements,
  isRequireAaaSectionsMessageId,
} from "./rule.reporting-helpers";

describe(getMockSectionComments, () => {
  it("returns array with Arrange and Act phase comments", () => {
    // Act
    const comments = getMockSectionComments();

    // Assert
    expect(comments).toHaveLength(2);
    expect(comments[0]?.phases).toStrictEqual(["Arrange"]);
    expect(comments[1]?.phases).toStrictEqual(["Act"]);
  });
});

describe(getMockStatements, () => {
  it("returns array with 3 statements", () => {
    // Act
    const statements = getMockStatements();

    // Assert
    expect(statements).toHaveLength(3);
    expect(statements[0]?.phase).toBeUndefined();
    expect(statements[1]?.phase).toBe("Arrange");
    expect(statements[2]?.phase).toBe("Act");
  });
});

describe(isRequireAaaSectionsMessageId, () => {
  it("returns true for valid message identifier blankLineBeforeSection", () => {
    // Act
    const isValid = isRequireAaaSectionsMessageId("blankLineBeforeSection");

    // Assert
    expect(isValid).toBe(true);
  });

  it("returns false for invalid string identifier", () => {
    // Act
    const isValid = isRequireAaaSectionsMessageId("invalid");

    // Assert
    expect(isValid).toBe(false);
  });

  it("returns false for number values", () => {
    // Act
    const isValid = isRequireAaaSectionsMessageId(123);

    // Assert
    expect(isValid).toBe(false);
  });
});
