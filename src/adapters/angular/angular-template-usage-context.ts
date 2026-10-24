import * as angular from "@angular/compiler";
import * as ts from "typescript";

import type { PublicMember } from "../../domain/architecture/no-unused-public-members/member-declaration-utilities";

type AngularTemplateNode = ReturnType<
  typeof angular.parseTemplate
>["nodes"][number];

type MemberPathSegment = { call: true } | { name: string };

type TemplateLocals = ReadonlyMap<string, angular.AST | undefined>;

interface TemplateMemberPath {
  root: "component" | "implicit";
  segments: MemberPathSegment[];
}

type TemplateNodeVisitor = (
  nodes: AngularTemplateNode[],
  locals: TemplateLocals,
  usage: TemplateUsageContext,
) => boolean;

interface TemplateUsageContext {
  checker: ts.TypeChecker;
  component: ts.ClassDeclaration;
  componentSymbol: ts.Symbol;
  member: PublicMember;
}

const withNames = (
  locals: TemplateLocals,
  names: readonly string[],
): TemplateLocals => {
  const extended = new Map(locals);
  for (const name of names) {
    extended.set(name, undefined);
  }
  return extended;
};

const withAlias = (
  locals: TemplateLocals,
  name: string,
  value: angular.AST,
): TemplateLocals => new Map([...locals, [name, value]]);

export type {
  AngularTemplateNode,
  TemplateLocals,
  TemplateMemberPath,
  TemplateNodeVisitor,
  TemplateUsageContext,
};
export { withAlias, withNames };
