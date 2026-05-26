import { describe, expect, it } from "vitest";

import {
  getMockSectionComments,
  getMockStatements,
  isRequireAaaSectionsMessageId,
} from "./rule.reporting-helpers";

describe(getMockSectionComments, () => {
  it("returns array with Arrange and Act phase comments", () => {
    // Act
    const actualComments = getMockSectionComments();

    // Assert
    expect(actualComments).toHaveLength(2);
    expect(actualComments[0]?.phases).toStrictEqual(["Arrange"]);
    expect(actualComments[1]?.phases).toStrictEqual(["Act"]);
  });
});

describe(getMockStatements, () => {
  it("returns array with 3 statements", () => {
    // Act
    const actualStatements = getMockStatements();

    // Assert
    expect(actualStatements).toHaveLength(3);
    expect(actualStatements[0]?.phase).toBeUndefined();
    expect(actualStatements[1]?.phase).toBe("Arrange");
    expect(actualStatements[2]?.phase).toBe("Act");
  });
});

describe(isRequireAaaSectionsMessageId, () => {
  it("returns true for valid message identifier blankLineBeforeSection", () => {
    // Act
    const actualIsValid = isRequireAaaSectionsMessageId(
      "blankLineBeforeSection",
    );

    // Assert
    expect(actualIsValid).toBe(true);
  });

  it("returns false for invalid string identifier", () => {
    // Act
    const actualIsValid = isRequireAaaSectionsMessageId("invalid");

    // Assert
    expect(actualIsValid).toBe(false);
  });

  it("returns false for number values", () => {
    // Act
    const actualIsValid = isRequireAaaSectionsMessageId(123);

    // Assert
    expect(actualIsValid).toBe(false);
  });
});
