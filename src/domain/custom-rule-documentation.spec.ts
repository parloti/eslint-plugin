import { describe, expect, it } from "vitest";

import {
  createRuleDocumentation,
  customRuleDocumentationBaseUrl,
  getCustomRuleDocumentationUrl,
} from "./custom-rule-documentation";

describe(getCustomRuleDocumentationUrl, () => {
  it("builds the canonical rule URL", () => {
    // Arrange

    // Act & Assert
    expect(getCustomRuleDocumentationUrl("prefer-interface-types")).toBe(
      `${customRuleDocumentationBaseUrl}/prefer-interface-types.md`,
    );
  });
});

describe(createRuleDocumentation, () => {
  it("returns the shared custom rule docs shape", () => {
    // Arrange

    // Act & Assert
    expect(
      createRuleDocumentation("prefer-interface-types", "Rule description"),
    ).toStrictEqual({
      description: "Rule description",
      url: `${customRuleDocumentationBaseUrl}/prefer-interface-types.md`,
    });
  });
});
