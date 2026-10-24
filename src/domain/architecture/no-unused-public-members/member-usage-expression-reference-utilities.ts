import * as ts from "typescript";

import {
  isSameSymbol,
  resolveCanonicalSymbol,
} from "../no-unused-exports/no-unused-exports-symbol-utilities";

/**
 * Checks whether an expression can be traced back to a symbol.
 * @param expression Expression to inspect.
 * @param targetSymbol Symbol whose value flow is followed.
 * @param checker TypeScript type checker.
 * @param visitedExpressions Expressions already inspected.
 * @returns True when the expression derives from the target symbol.
 * @example
 * ```typescript
 * const forwarded = expressionReferencesSymbol(value, symbol, checker);
 * ```
 */
const expressionReferencesSymbol = (
  expression: ts.Expression,
  targetSymbol: ts.Symbol,
  checker: ts.TypeChecker,
  visitedExpressions: Set<ts.Node> = new Set(),
): boolean => {
  if (visitedExpressions.has(expression)) {
    return false;
  }
  visitedExpressions.add(expression);

  if (ts.isIdentifier(expression)) {
    const symbol = ts.isShorthandPropertyAssignment(expression.parent)
      ? checker.getShorthandAssignmentValueSymbol(expression.parent)
      : checker.getSymbolAtLocation(expression);

    if (
      symbol !== void 0 &&
      isSameSymbol(
        resolveCanonicalSymbol(symbol, checker),
        resolveCanonicalSymbol(targetSymbol, checker),
      )
    ) {
      return true;
    }

    const declaration = symbol?.valueDeclaration;
    if (declaration !== void 0 && ts.isVariableDeclaration(declaration)) {
      return (
        declaration.initializer !== void 0 &&
        expressionReferencesSymbol(
          declaration.initializer,
          targetSymbol,
          checker,
          visitedExpressions,
        )
      );
    }
    if (
      declaration !== void 0 &&
      ts.isBindingElement(declaration) &&
      ts.isObjectBindingPattern(declaration.parent)
    ) {
      const owner = declaration.parent.parent;

      return (
        ts.isVariableDeclaration(owner) &&
        owner.initializer !== void 0 &&
        expressionReferencesSymbol(
          owner.initializer,
          targetSymbol,
          checker,
          visitedExpressions,
        )
      );
    }

    return false;
  }

  if (
    ts.isAsExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isParenthesizedExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isTypeAssertionExpression(expression)
  ) {
    return expressionReferencesSymbol(
      expression.expression,
      targetSymbol,
      checker,
      visitedExpressions,
    );
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expressionReferencesSymbol(
      expression.expression,
      targetSymbol,
      checker,
      visitedExpressions,
    );
  }

  if (ts.isElementAccessExpression(expression)) {
    return expressionReferencesSymbol(
      expression.expression,
      targetSymbol,
      checker,
      visitedExpressions,
    );
  }

  if (ts.isCallExpression(expression)) {
    return expression.arguments.some((argument) =>
      expressionReferencesSymbol(
        argument,
        targetSymbol,
        checker,
        visitedExpressions,
      ),
    );
  }

  if (ts.isConditionalExpression(expression)) {
    return (
      expressionReferencesSymbol(
        expression.whenTrue,
        targetSymbol,
        checker,
        visitedExpressions,
      ) ||
      expressionReferencesSymbol(
        expression.whenFalse,
        targetSymbol,
        checker,
        visitedExpressions,
      )
    );
  }

  if (ts.isObjectLiteralExpression(expression)) {
    return expression.properties.some((property) => {
      return ts.isSpreadAssignment(property)
        ? expressionReferencesSymbol(
            property.expression,
            targetSymbol,
            checker,
            visitedExpressions,
          )
        : (ts.isPropertyAssignment(property) &&
            expressionReferencesSymbol(
              property.initializer,
              targetSymbol,
              checker,
              visitedExpressions,
            )) ||
            (ts.isShorthandPropertyAssignment(property) &&
              expressionReferencesSymbol(
                property.name,
                targetSymbol,
                checker,
                visitedExpressions,
              ));
    });
  }

  return (
    ts.isArrayLiteralExpression(expression) &&
    expression.elements.some((element) =>
      expressionReferencesSymbol(
        element,
        targetSymbol,
        checker,
        visitedExpressions,
      ),
    )
  );
};

export { expressionReferencesSymbol };
