import * as angular from "@angular/compiler";

import type {
  AngularTemplateNode,
  TemplateLocals,
  TemplateNodeVisitor,
  TemplateUsageContext,
} from "./angular-template-usage-context";

import { expressionUsesMember } from "./angular-template-expression-utilities";
import { withAlias, withNames } from "./angular-template-usage-context";

const blockUsesMember = (
  node: AngularTemplateNode,
  locals: TemplateLocals,
  usage: TemplateUsageContext,
  visitNodes: TemplateNodeVisitor,
): boolean => {
  if (node instanceof angular.TmplAstIfBlock) {
    return node.branches.some((branch) => {
      const alias = branch.expressionAlias?.name;
      const aliasValue = branch.expression ?? undefined;
      const branchLocals =
        alias === undefined
          ? locals
          : aliasValue === undefined
            ? withNames(locals, [alias])
            : withAlias(locals, alias, aliasValue);

      return (
        uses(branch.expression ?? undefined, locals) ||
        visitNodes(branch.children, branchLocals, usage)
      );
    });
  }

  if (node instanceof angular.TmplAstForLoopBlock) {
    const loopLocals = withNames(locals, [
      node.item.name,
      ...node.contextVariables.map(({ name }) => name),
    ]);

    return (
      uses(node.expression, locals) ||
      uses(node.trackBy ?? undefined, loopLocals) ||
      visitNodes(node.children, loopLocals, usage) ||
      (node.empty !== null && visitNodes(node.empty.children, locals, usage))
    );
  }

  if (node instanceof angular.TmplAstSwitchBlock) {
    return (
      uses(node.expression, locals) ||
      node.groups.some(
        (group) =>
          group.cases.some((branch) =>
            uses(branch.expression ?? undefined, locals),
          ) || visitNodes(group.children, locals, usage),
      )
    );
  }

  if (node instanceof angular.TmplAstDeferredBlock) {
    const triggers = [
      ...Object.values(node.triggers),
      ...Object.values(node.prefetchTriggers),
      ...Object.values(node.hydrateTriggers),
    ];

    return (
      triggers.some(
        (trigger) =>
          trigger instanceof angular.TmplAstBoundDeferredTrigger &&
          uses(trigger.value, locals),
      ) ||
      visitNodes(node.children, locals, usage) ||
      (node.placeholder !== null &&
        visitNodes(node.placeholder.children, locals, usage)) ||
      (node.loading !== null &&
        visitNodes(node.loading.children, locals, usage)) ||
      (node.error !== null && visitNodes(node.error.children, locals, usage))
    );
  }

  return (
    (node instanceof angular.TmplAstBoundaryBlock &&
      (visitNodes(node.children, locals, usage) ||
        node.errorBlocks.some(
          (branch) =>
            uses(branch.expression ?? undefined, locals) ||
            visitNodes(
              branch.children,
              withNames(
                locals,
                branch.contextVariables.map(({ name }) => name),
              ),
              usage,
            ),
        ))) ||
    (node instanceof angular.TmplAstContentBlock &&
      visitNodes(
        node.children,
        withNames(
          locals,
          node.variables.map(({ name }) => name),
        ),
        usage,
      ))
  );

  /**
   * Checks an Angular expression against the selected component member.
   * @param expression Template expression to inspect.
   * @param expressionLocals Template locals in scope for the expression.
   * @returns Whether the expression reads the member.
   * @example
   * ```typescript
   * const used = uses(templateExpression, locals);
   * ```
   */
  function uses(
    expression: angular.AST | undefined,
    expressionLocals: TemplateLocals,
  ): boolean {
    return (
      expression !== undefined &&
      expressionUsesMember(expression, expressionLocals, usage)
    );
  }
};

export { blockUsesMember };
