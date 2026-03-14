/** Minimal shared docs metadata shape for package-owned custom rules. */
interface CustomRuleDocumentation {
  /** Human-readable rule description. */
  description: string;

  /** Canonical documentation URL for the rule. */
  url: string;
}

/** Base URL for published custom rule documentation pages. */
const customRuleDocumentationBaseUrl =
  "https://github.com/codeperfect/eslint-plugin/blob/main/docs/rules";

/**
 * Creates shared docs metadata for a package-owned custom rule.
 * @param ruleName ESLint rule name without the plugin prefix.
 * @param description Input description value.
 * @returns Return value output.
 * @example
 * ```typescript
 * const docs = createRuleDocumentation(
 *   "prefer-interface-types",
 *   "Rule description",
 * );
 * ```
 */
function createRuleDocumentation(
  ruleName: string,
  description: string,
): CustomRuleDocumentation {
  return {
    description,
    url: getCustomRuleDocumentationUrl(ruleName),
  };
}

/**
 * Builds the canonical documentation URL for a package-owned custom rule.
 * @param ruleName ESLint rule name without the plugin prefix.
 * @returns Return value output.
 * @example
 * ```typescript
 * const url = getCustomRuleDocumentationUrl("prefer-interface-types");
 * ```
 */
function getCustomRuleDocumentationUrl(ruleName: string): string {
  return `${customRuleDocumentationBaseUrl}/${ruleName}.md`;
}

export {
  createRuleDocumentation,
  customRuleDocumentationBaseUrl,
  getCustomRuleDocumentationUrl,
};
export type { CustomRuleDocumentation };
