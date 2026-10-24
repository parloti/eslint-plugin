import * as angular from "@angular/compiler";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import * as ts from "typescript";

import type { PublicMember } from "../../domain/architecture/no-unused-public-members/member-declaration-utilities";
import type { MemberUsageAdapter } from "../../domain/architecture/no-unused-public-members/member-usage-utilities";
import type {
  AngularTemplateNode,
  TemplateUsageContext,
} from "./angular-template-usage-context";

import { templateNodesUseMember } from "./angular-template-node-usage-utilities";

interface ComponentTemplate {
  content: string;
  filePath: string;
}

const componentTemplateCache = new WeakMap<
  ts.ClassDeclaration,
  ComponentTemplate | undefined
>();
const parsedTemplateCache = new WeakMap<
  ts.ClassDeclaration,
  AngularTemplateNode[] | undefined
>();

/**
 * Resolves public-member usage in statically declared Angular templates.
 * @param sourceFile TypeScript source file being inspected.
 * @param checker TypeScript checker for the project.
 * @param member Public member whose template usage is being checked.
 * @returns Whether an Angular template references the member.
 * @example
 * ```typescript
 * const used = angularTemplateUsageAdapter(sourceFile, checker, member);
 * ```
 */
const angularTemplateUsageAdapter: MemberUsageAdapter = (
  sourceFile,
  checker,
  member,
) =>
  sourceFile.statements.some((statement) => {
    if (!ts.isClassDeclaration(statement)) {
      return false;
    }

    const template = getComponentTemplate(statement, sourceFile, checker);
    const componentSymbol =
      statement.name === undefined
        ? undefined
        : checker.getSymbolAtLocation(statement.name);

    return (
      template !== undefined &&
      componentSymbol !== undefined &&
      templateUsesMember(template, statement, componentSymbol, checker, member)
    );
  });

const getComponentTemplate = (
  declaration: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): ComponentTemplate | undefined => {
  if (componentTemplateCache.has(declaration)) {
    return componentTemplateCache.get(declaration);
  }

  const decorators = ts.canHaveDecorators(declaration)
    ? (ts.getDecorators(declaration) ?? [])
    : [];

  for (const decorator of decorators) {
    if (
      !ts.isCallExpression(decorator.expression) ||
      !ts.isIdentifier(decorator.expression.expression) ||
      !isAngularComponentImport(decorator.expression.expression, checker)
    ) {
      continue;
    }

    const [metadata] = decorator.expression.arguments;
    if (metadata === undefined || !ts.isObjectLiteralExpression(metadata)) {
      continue;
    }

    for (const property of metadata.properties) {
      if (
        !ts.isPropertyAssignment(property) ||
        (!ts.isIdentifier(property.name) &&
          !ts.isStringLiteralLike(property.name))
      ) {
        continue;
      }

      if (
        property.name.text === "template" &&
        ts.isStringLiteralLike(property.initializer)
      ) {
        const template = {
          content: property.initializer.text,
          filePath: sourceFile.fileName,
        };
        componentTemplateCache.set(declaration, template);
        return template;
      }

      if (
        property.name.text === "templateUrl" &&
        ts.isStringLiteralLike(property.initializer)
      ) {
        const filePath = path.resolve(
          path.dirname(sourceFile.fileName),
          property.initializer.text,
        );
        const template = readTemplateFile(filePath);
        componentTemplateCache.set(declaration, template);
        return template;
      }
    }
  }

  componentTemplateCache.set(declaration, undefined);
  return undefined;
};

const isAngularComponentImport = (
  identifier: ts.Identifier,
  checker: ts.TypeChecker,
): boolean =>
  checker.getSymbolAtLocation(identifier)?.declarations?.some((declaration) => {
    if (!ts.isImportSpecifier(declaration)) {
      return false;
    }

    const importClause = declaration.parent.parent;
    if (!ts.isImportClause(importClause)) {
      return false;
    }

    const importDeclaration = importClause.parent;
    return (
      ts.isImportDeclaration(importDeclaration) &&
      ts.isStringLiteral(importDeclaration.moduleSpecifier) &&
      importDeclaration.moduleSpecifier.text === "@angular/core" &&
      (declaration.propertyName?.text ?? declaration.name.text) === "Component"
    );
  }) ?? false;

const readTemplateFile = (filePath: string): ComponentTemplate | undefined => {
  if (!existsSync(filePath)) {
    return undefined;
  }

  try {
    return { content: readFileSync(filePath, "utf8"), filePath };
  } catch {
    return undefined;
  }
};

const templateUsesMember = (
  template: ComponentTemplate,
  component: ts.ClassDeclaration,
  componentSymbol: ts.Symbol,
  checker: ts.TypeChecker,
  member: PublicMember,
): boolean => {
  const nodes = getParsedTemplateNodes(template, component);
  if (nodes === undefined) {
    return false;
  }

  const usage: TemplateUsageContext = {
    checker,
    component,
    componentSymbol,
    member,
  };
  return templateNodesUseMember(nodes, new Map(), usage);
};

const getParsedTemplateNodes = (
  template: ComponentTemplate,
  component: ts.ClassDeclaration,
): AngularTemplateNode[] | undefined => {
  if (parsedTemplateCache.has(component)) {
    return parsedTemplateCache.get(component);
  }

  const parsed = angular.parseTemplate(template.content, template.filePath, {
    enableBlockSyntax: true,
    enableLetSyntax: true,
  });
  const nodes = parsed.errors === null ? parsed.nodes : undefined;
  parsedTemplateCache.set(component, nodes);
  return nodes;
};

export { angularTemplateUsageAdapter };
