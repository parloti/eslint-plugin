import type { Rule } from "eslint";
import type * as ESTree from "estree";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import {
  analyzeTestBlock,
  getAssertDeclaredIdentifiers,
  getAssertionIdentifiers,
  hasAssertion,
  usesPrefix,
} from "../aaa";

/** Supported assertion variable prefixes enforced by this rule. */
type AssertionPrefix = "actual" | "expected";

/** Composite input for reporting one missing assertion prefix. */
interface ReportAssertionIdentifierInput {
  /** Active ESLint rule context. */
  context: Rule.RuleContext;

  /** Declared identifiers collected from the assert phase. */
  declaredIdentifiers: ReturnType<typeof getAssertDeclaredIdentifiers>;

  /** Identifier name extracted from the assertion. */
  name: string | undefined;

  /** Required prefix for the identifier. */
  prefix: AssertionPrefix;

  /** Set of already reported identifier keys. */
  reportedNames: Set<string>;
}

/** Composite input for reporting missing prefixes in one assertion. */
interface ReportAssertionPrefixesInput {
  /** Assertion node whose identifiers should be inspected. */
  assertionNode: ESTree.Statement;

  /** Active ESLint rule context. */
  context: Rule.RuleContext;

  /** Declared identifiers collected from the assert phase. */
  declaredIdentifiers: ReturnType<typeof getAssertDeclaredIdentifiers>;

  /** Set of already reported identifier keys. */
  reportedNames: Set<string>;
}

/**
 * Builds the de-duplication key for a reported assertion identifier.
 * @param prefix Prefix used for the assertion identifier.
 * @param name Identifier name reported by the rule.
 * @returns Stable de-duplication key for the identifier.
 * @example
 * ```typescript
 * const key = getReportedNameKey("actual", "value");
 * ```
 */
const getReportedNameKey = (prefix: AssertionPrefix, name: string): string =>
  `${prefix}:${name}`;

/**
 * Reports a missing assertion prefix when the declared identifier is eligible.
 * @param input Composite reporting input for one identifier.
 * @example
 * ```typescript
 * reportAssertionIdentifier({
 *   context: {} as Rule.RuleContext,
 *   declaredIdentifiers: new Map(),
 *   name: "value",
 *   prefix: "actual",
 *   reportedNames: new Set(),
 * });
 * ```
 */
const reportAssertionIdentifier = (
  input: ReportAssertionIdentifierInput,
): void => {
  const { context, declaredIdentifiers, name, prefix, reportedNames } = input;

  const declaredIdentifier =
    name === void 0 || usesPrefix(name, prefix)
      ? void 0
      : declaredIdentifiers.get(name);
  if (declaredIdentifier === void 0 || name === void 0) {
    return;
  }

  const reportedNameKey = getReportedNameKey(prefix, name);
  if (reportedNames.has(reportedNameKey)) {
    return;
  }

  reportedNames.add(reportedNameKey);
  context.report({
    data: { name, prefix },
    messageId: "missingPrefix",
    node: declaredIdentifier,
  });
};

/**
 * Reports missing prefixes for the actual and expected identifiers in one assertion.
 * @param input Composite reporting input for one assertion.
 * @example
 * ```typescript
 * reportAssertionPrefixes({
 *   assertionNode: {} as ESTree.Statement,
 *   context: {} as Rule.RuleContext,
 *   declaredIdentifiers: new Map(),
 *   reportedNames: new Set(),
 * });
 * ```
 */
const reportAssertionPrefixes = (input: ReportAssertionPrefixesInput): void => {
  const { assertionNode, context, declaredIdentifiers, reportedNames } = input;
  const { actual, expected } = getAssertionIdentifiers(assertionNode);

  reportAssertionIdentifier({
    context,
    declaredIdentifiers,
    name: actual,
    prefix: "actual",
    reportedNames,
  });
  reportAssertionIdentifier({
    context,
    declaredIdentifiers,
    name: expected,
    prefix: "expected",
    reportedNames,
  });
};

/** Enforces actual/expected-style prefixes for assert-phase comparison variables. */
const assertActualExpectedNamesRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const analysis = analyzeTestBlock(context, node);
        if (analysis === void 0) {
          return;
        }

        const declaredIdentifiers = getAssertDeclaredIdentifiers(analysis);
        const reportedNames = new Set<string>();

        for (const statement of analysis.statements) {
          if (
            statement.phases.includes("Assert") &&
            hasAssertion(statement.node)
          ) {
            reportAssertionPrefixes({
              assertionNode: statement.node,
              context,
              declaredIdentifiers,
              reportedNames,
            });
          }
        }
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: createRuleDocumentation(
      "assert-actual-expected-names",
      "Require Assert-phase comparison variables to use actual*/expected* prefixes.",
    ),
    messages: {
      missingPrefix:
        "Rename '{{name}}' to use the '{{prefix}}' prefix when comparing values inside // Assert.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { assertActualExpectedNamesRule };
