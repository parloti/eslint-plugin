import { describe, expect, it } from "vitest";

import {
  createRuleDocumentation,
  customRuleDocumentationBaseUrl,
  getCustomRuleDocumentationUrl,
} from "./custom-rule-documentation";

describe(getCustomRuleDocumentationUrl, () => {
  it("builds the canonical rule URL", () => {
    // Arrange
    const ruleName = "prefer-interface-types";
    const expectedUrl = `${customRuleDocumentationBaseUrl}/prefer-interface-types.md`;

    // Act
    const actualUrl = getCustomRuleDocumentationUrl(ruleName);

    // Assert
    expect(actualUrl).toBe(expectedUrl);
  });
});

describe(createRuleDocumentation, () => {
  it("returns the shared custom rule docs shape", () => {
    // Arrange
    const ruleName = "prefer-interface-types";
    const description = "Rule description";
    const expectedDocumentation = {
      description,
      url: `${customRuleDocumentationBaseUrl}/prefer-interface-types.md`,
    };

    // Act
    const actualDocumentation = createRuleDocumentation(ruleName, description);

    // Assert
    expect(actualDocumentation).toStrictEqual(expectedDocumentation);
  });
});
