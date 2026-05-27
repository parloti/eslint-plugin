import { describe, expect, it } from "vitest";

import { createRuleDocumentation } from "./custom-rule-documentation";

/** Canonical base URL for package-owned rule documentation pages. */
const customRuleDocumentationBaseUrl =
  "https://github.com/parloti/eslint-plugin/blob/main/docs/rules";

describe(createRuleDocumentation, () => {
  it("returns the shared custom rule docs shape", () => {
    // Arrange
    const ruleName = "prefer-interface-types";
    const description = "Rule description";
    const expectedDocumentation = {
      description,
      recommended: false,
      url: `${customRuleDocumentationBaseUrl}/prefer-interface-types.md`,
    };

    // Act
    const actualDocumentation = createRuleDocumentation(ruleName, description);

    // Assert
    expect(actualDocumentation).toStrictEqual(expectedDocumentation);
  });
});
