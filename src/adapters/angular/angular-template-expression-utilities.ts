import * as angular from "@angular/compiler";
import * as ts from "typescript";

import type {
  TemplateLocals,
  TemplateMemberPath,
  TemplateUsageContext,
} from "./angular-template-usage-context";

import { isSameSymbol } from "../../domain/architecture/no-unused-exports/no-unused-exports-symbol-utilities";

const expressionUsesMember = (
  expression: angular.AST,
  locals: TemplateLocals,
  usage: TemplateUsageContext,
): boolean => {
  class MemberReadVisitor extends angular.RecursiveAstVisitor {
    found = false;

    override visitPropertyRead(ast: angular.PropertyRead): void {
      this.record(ast);
      super.visitPropertyRead(ast, undefined);
    }

    override visitSafePropertyRead(ast: angular.SafePropertyRead): void {
      this.record(ast);
      super.visitSafePropertyRead(ast, undefined);
    }

    private record(ast: angular.PropertyRead | angular.SafePropertyRead): void {
      if (
        ast.name === usage.member.memberName &&
        resolveTemplatePath(getMemberPath(ast), locals, usage)
      ) {
        this.found = true;
      }
    }
  }

  const visitor = new MemberReadVisitor();
  expression.visit(visitor);
  return visitor.found;
};

const getMemberPath = (
  expression: angular.AST,
): TemplateMemberPath | undefined => {
  if (expression instanceof angular.ASTWithSource) {
    const sourceAst: unknown = expression.ast;
    return sourceAst instanceof angular.AST
      ? getMemberPath(sourceAst)
      : undefined;
  }

  if (expression instanceof angular.ImplicitReceiver) {
    return { root: "implicit", segments: [] };
  }

  if (expression instanceof angular.ThisReceiver) {
    return { root: "component", segments: [] };
  }

  if (
    expression instanceof angular.PropertyRead ||
    expression instanceof angular.SafePropertyRead
  ) {
    const parentPath = getMemberPath(expression.receiver);
    return parentPath === undefined
      ? undefined
      : {
          ...parentPath,
          segments: [...parentPath.segments, { name: expression.name }],
        };
  }

  if (
    expression instanceof angular.Call ||
    expression instanceof angular.SafeCall
  ) {
    if (expression.args.length > 0) {
      return undefined;
    }

    const calleePath = getMemberPath(expression.receiver);
    return calleePath === undefined
      ? undefined
      : { ...calleePath, segments: [...calleePath.segments, { call: true }] };
  }

  if (expression instanceof angular.ParenthesizedExpression) {
    return getMemberPath(expression.expression);
  }

  return expression instanceof angular.NonNullAssert
    ? getMemberPath(expression.expression)
    : undefined;
};

const resolveTemplatePath = (
  templatePath: TemplateMemberPath | undefined,
  locals: TemplateLocals,
  usage: TemplateUsageContext,
): boolean => {
  const resolvedPath = expandTemplateLocals(templatePath, locals);
  if (resolvedPath === undefined || resolvedPath.segments.length === 0) {
    return false;
  }

  const { segments } = resolvedPath;
  const [firstSegment] = segments;

  if (firstSegment === undefined || !("name" in firstSegment)) {
    return false;
  }

  let currentType = usage.checker.getDeclaredTypeOfSymbol(
    usage.componentSymbol,
  );

  for (const [index, segment] of segments.entries()) {
    if ("call" in segment) {
      const [signature] = usage.checker.getSignaturesOfType(
        currentType,
        ts.SignatureKind.Call,
      );
      if (signature === undefined) {
        return false;
      }

      currentType = usage.checker.getReturnTypeOfSignature(signature);
      continue;
    }

    const property = usage.checker.getPropertyOfType(
      usage.checker.getNonNullableType(currentType),
      segment.name,
    );
    if (property === undefined) {
      return false;
    }

    if (index === segments.length - 1) {
      return isSameSymbol(property, usage.member.memberSymbol);
    }

    currentType = usage.checker.getTypeOfSymbolAtLocation(
      property,
      usage.component,
    );
  }

  return false;
};

const expandTemplateLocals = (
  templatePath: TemplateMemberPath | undefined,
  locals: TemplateLocals,
  visitedLocals: ReadonlySet<string> = new Set(),
): TemplateMemberPath | undefined => {
  if (templatePath?.root !== "implicit") {
    return templatePath;
  }

  const [firstSegment] = templatePath.segments;
  if (
    firstSegment === undefined ||
    !("name" in firstSegment) ||
    !locals.has(firstSegment.name)
  ) {
    return templatePath;
  }

  const localName = firstSegment.name;
  const localValue = locals.get(localName);
  if (localValue === undefined || visitedLocals.has(localName)) {
    return undefined;
  }

  const localPath = getMemberPath(localValue);
  return expandTemplateLocals(
    localPath === undefined
      ? undefined
      : {
          ...localPath,
          segments: [...localPath.segments, ...templatePath.segments.slice(1)],
        },
    locals,
    new Set([...visitedLocals, localName]),
  );
};

export { expressionUsesMember };
