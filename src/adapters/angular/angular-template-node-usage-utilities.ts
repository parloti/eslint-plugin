import * as angular from "@angular/compiler";

import type {
  AngularTemplateNode,
  TemplateLocals,
  TemplateUsageContext,
} from "./angular-template-usage-context";

import { blockUsesMember } from "./angular-template-block-usage-utilities";
import { expressionUsesMember } from "./angular-template-expression-utilities";
import { withNames } from "./angular-template-usage-context";

const templateNodesUseMember = (
  nodes: AngularTemplateNode[],
  inheritedLocals: TemplateLocals,
  usage: TemplateUsageContext,
): boolean => {
  const locals = new Map(inheritedLocals);

  for (const node of nodes) {
    if (node instanceof angular.TmplAstLetDeclaration) {
      if (expressionUsesMember(node.value, locals, usage)) {
        return true;
      }

      locals.set(node.name, node.value);
    } else if (nodeUsesMember(node, locals, usage)) {
      return true;
    }
  }

  return false;
};

const nodeUsesMember = (
  node: AngularTemplateNode,
  locals: TemplateLocals,
  usage: TemplateUsageContext,
): boolean => {
  if (node instanceof angular.TmplAstBoundText) {
    return expressionUsesMember(node.value, locals, usage);
  }

  if (node instanceof angular.TmplAstElement) {
    return (
      inputsUseMember(node.inputs, locals, usage) ||
      eventsUseMember(node.outputs, locals, usage) ||
      templateNodesUseMember(
        node.children,
        withNames(
          locals,
          node.references.map(({ name }) => name),
        ),
        usage,
      )
    );
  }

  if (node instanceof angular.TmplAstTemplate) {
    const templateLocals = withNames(
      locals,
      [...node.variables, ...node.references].map(({ name }) => name),
    );

    return (
      inputsUseMember(node.inputs, locals, usage) ||
      eventsUseMember(node.outputs, locals, usage) ||
      node.templateAttrs.some(
        (attribute) =>
          attribute instanceof angular.TmplAstBoundAttribute &&
          expressionUsesMember(attribute.value, locals, usage),
      ) ||
      templateNodesUseMember(node.children, templateLocals, usage)
    );
  }

  return node instanceof angular.TmplAstContent
    ? templateNodesUseMember(node.children, locals, usage)
    : blockUsesMember(node, locals, usage, templateNodesUseMember);
};

const inputsUseMember = (
  inputs: readonly angular.TmplAstBoundAttribute[],
  locals: TemplateLocals,
  usage: TemplateUsageContext,
): boolean =>
  inputs.some((input) => expressionUsesMember(input.value, locals, usage));

const eventsUseMember = (
  events: readonly angular.TmplAstBoundEvent[],
  locals: TemplateLocals,
  usage: TemplateUsageContext,
): boolean => {
  const eventLocals = withNames(locals, ["$event"]);
  return events.some((event) =>
    expressionUsesMember(event.handler, eventLocals, usage),
  );
};

export { templateNodesUseMember };
