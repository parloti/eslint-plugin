import type { Rule } from "eslint";
import type * as ESTree from "estree";

import type { TestBlockAnalysis } from "../aaa";

import { createRuleDocumentation } from "../../custom-rule-documentation";
import {
  analyzeTestBlock,
  hasAssertion,
  hasAsyncLogic,
  hasAwait,
  hasCapturableActResult,
  hasMutation,
  isMeaningfulActStatement,
  isSetupLikeStatement,
  isValidAssertStatement,
} from "../aaa";

/**
 * @param pattern
 * @param identifiers
 * @example
 */
function collectPatternIdentifiers(
  pattern: ESTree.Pattern,
  identifiers: Set<string>,
): void {
  if (pattern.type === "Identifier") {
    identifiers.add(pattern.name);
    return;
  }

  if (pattern.type === "RestElement") {
    collectPatternIdentifiers(pattern.argument, identifiers);
    return;
  }

  if (pattern.type === "AssignmentPattern") {
    collectPatternIdentifiers(pattern.left, identifiers);
    return;
  }

  if (pattern.type === "ArrayPattern") {
    for (const element of pattern.elements) {
      if (element !== null) {
        collectPatternIdentifiers(element, identifiers);
      }
    }
    return;
  }

  if (pattern.type !== "ObjectPattern") {
    return;
  }

  for (const property of pattern.properties) {
    if (property.type === "Property") {
      collectPatternIdentifiers(property.value, identifiers);
      continue;
    }

    collectPatternIdentifiers(property.argument, identifiers);
  }
}

/**
 * @param node
 * @param identifiers
 * @example
 */
function collectReferencedIdentifiers(
  node: ESTree.Node,
  identifiers: Set<string>,
): void {
  if (node.type === "Identifier") {
    identifiers.add(node.name);
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) {
          collectReferencedIdentifiers(item, identifiers);
        }
      }
      continue;
    }

    if (isNode(value)) {
      collectReferencedIdentifiers(value, identifiers);
    }
  }
}

/**
 * @param statement
 * @example
 */
function getActDeclaredIdentifiers(statement: ESTree.Statement): Set<string> {
  const identifiers = new Set<string>();

  if (statement.type !== "VariableDeclaration") {
    return identifiers;
  }

  for (const declaration of statement.declarations) {
    collectPatternIdentifiers(declaration.id, identifiers);
  }

  return identifiers;
}

/**
 * @param analysis
 * @example
 */
function getAssertReferencedIdentifiers(
  analysis: TestBlockAnalysis,
): Set<string> {
  const identifiers = new Set<string>();

  for (const statement of analysis.statements) {
    if (!statement.phases.includes("Assert")) {
      continue;
    }

    if (statement.node.type === "VariableDeclaration") {
      for (const declaration of statement.node.declarations) {
        if (declaration.init !== null && declaration.init !== void 0) {
          collectReferencedIdentifiers(declaration.init, identifiers);
        }
      }
      continue;
    }

    collectReferencedIdentifiers(statement.node, identifiers);
  }

  return identifiers;
}

/**
 * @param assertReferencedIdentifiers
 * @param statement
 * @example
 */
function isActResultAsserted(
  assertReferencedIdentifiers: Set<string>,
  statement: ESTree.Statement,
): boolean {
  for (const identifier of getActDeclaredIdentifiers(statement)) {
    if (assertReferencedIdentifiers.has(identifier)) {
      return true;
    }
  }

  return false;
}

/**
 * @param value
 * @example
 */
function isNode(value: unknown): value is ESTree.Node {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (
      value as {
        /**
         *
         */
        type?: unknown;
      }
    ).type === "string"
  );
}

/**
 *
 */
const enforceAaaPhasePurityRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const analysis = analyzeTestBlock(context, node);
        if (analysis === void 0) {
          return;
        }

        const hasAllSections = ["Arrange", "Act", "Assert"].every((phase) =>
          analysis.sectionComments.some((sectionComment) =>
            sectionComment.phases.includes(phase as never),
          ),
        );
        if (!hasAllSections) {
          return;
        }

        let hasMeaningfulAct = false;
        const assertReferencedIdentifiers =
          getAssertReferencedIdentifiers(analysis);

        for (const statement of analysis.statements) {
          const allowsArrange = statement.phases.includes("Arrange");
          const allowsAct = statement.phases.includes("Act");
          const allowsAssert = statement.phases.includes("Assert");
          const containsAssertion = hasAssertion(statement.node);
          const containsAwait = hasAwait(statement.node);
          const containsAsyncLogic = hasAsyncLogic(statement.node);
          const containsMutation = hasMutation(statement.node);
          const isMeaningfulAct = isMeaningfulActStatement(statement.node);
          const isMeaningfulActContent =
            isMeaningfulAct ||
            hasCapturableActResult(statement.node) ||
            isActResultAsserted(assertReferencedIdentifiers, statement.node);
          const isSetupLike = isSetupLikeStatement(statement.node);
          const isValidAssert = isValidAssertStatement(statement.node);

          if (allowsAct && isMeaningfulActContent) {
            hasMeaningfulAct = true;
          }

          if (allowsArrange && !allowsAct) {
            if (containsAssertion && !allowsAssert) {
              context.report({
                messageId: "assertionOutsideAssert",
                node: statement.node,
              });
            }

            if (containsAwait) {
              context.report({
                messageId: "awaitOutsideAct",
                node: statement.node,
              });
            }

            if (containsAsyncLogic) {
              context.report({
                messageId: "asyncInArrange",
                node: statement.node,
              });
            }

            if (isMeaningfulAct) {
              context.report({
                messageId: "actionInArrange",
                node: statement.node,
              });
            }
            continue;
          }

          if (allowsAct && !allowsArrange) {
            if (containsAssertion && !allowsAssert) {
              context.report({
                messageId: "assertionOutsideAssert",
                node: statement.node,
              });
            }

            if (isSetupLike && !allowsArrange && !isMeaningfulActContent) {
              context.report({
                messageId: "setupAfterAct",
                node: statement.node,
              });
            }
            continue;
          }

          if (allowsAssert && !allowsAct) {
            if (containsAwait) {
              context.report({
                messageId: "awaitOutsideAct",
                node: statement.node,
              });
            }

            if (containsMutation) {
              context.report({
                messageId: "mutationAfterAct",
                node: statement.node,
              });
              continue;
            }

            if (!isValidAssert) {
              context.report({
                messageId: "nonAssertionInAssert",
                node: statement.node,
              });
            }
          }
        }

        if (!hasMeaningfulAct) {
          context.report({
            messageId: "missingMeaningfulAct",
            node: analysis.callExpression,
          });
        }
      },
    } satisfies Rule.RuleListener;
  },
  meta: {
    docs: createRuleDocumentation(
      "enforce-aaa-phase-purity",
      "Keep setup, action, and assertions inside their intended AAA phases.",
    ),
    messages: {
      actionInArrange:
        "Keep the function under test out of Arrange; reserve Arrange for setup only.",
      assertionOutsideAssert:
        "Move assertions into the // Assert section so test logic does not leak earlier.",
      asyncInArrange: "Do not trigger async behavior in Arrange.",
      awaitOutsideAct: "Use await only inside the // Act section.",
      missingMeaningfulAct:
        "The // Act section must contain a meaningful SUT interaction, not only utility or setup calls.",
      mutationAfterAct:
        "Do not mutate test data after the // Act section has run.",
      nonAssertionInAssert:
        "Keep the // Assert section focused on assertions and assertion-local values.",
      setupAfterAct:
        "Do not continue arranging test data after the // Act section has started.",
    },
    schema: [],
    type: "problem",
  },
};

export { enforceAaaPhasePurityRule };
