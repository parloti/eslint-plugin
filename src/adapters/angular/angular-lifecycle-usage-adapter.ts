import * as ts from "typescript";

import type { PublicMember } from "../../domain/architecture/no-unused-public-members/member-declaration-utilities";
import type { MemberUsageAdapter } from "../../domain/architecture/no-unused-public-members/member-usage-utilities";

const ANGULAR_LIFECYCLE_HOOKS: ReadonlyMap<string, readonly string[]> = new Map<
  string,
  readonly string[]
>([
  ["ngAfterContentChecked", ["Component", "Directive"]],
  ["ngAfterContentInit", ["Component", "Directive"]],
  ["ngAfterViewChecked", ["Component", "Directive"]],
  ["ngAfterViewInit", ["Component", "Directive"]],
  ["ngDoBootstrap", ["NgModule"]],
  ["ngDoCheck", ["Component", "Directive"]],
  ["ngOnChanges", ["Component", "Directive"]],
  ["ngOnDestroy", ["Component", "Directive", "Injectable", "NgModule", "Pipe"]],
  ["ngOnInit", ["Component", "Directive"]],
]);

/**
 * Resolves public-member usage through Angular lifecycle hook conventions.
 * @param sourceFile TypeScript source file being inspected.
 * @param checker TypeScript checker for the project.
 * @param member Public member whose lifecycle usage is being checked.
 * @returns Whether an Angular-managed class has a recognized hook.
 * @example
 * ```typescript
 * const used = angularLifecycleUsageAdapter(sourceFile, checker, member);
 * ```
 */
const angularLifecycleUsageAdapter: MemberUsageAdapter = (
  sourceFile,
  checker,
  member,
) => {
  const decoratorNames = ANGULAR_LIFECYCLE_HOOKS.get(member.memberName);

  if (
    decoratorNames === undefined ||
    !ts.isClassDeclaration(member.hostDeclaration)
  ) {
    return false;
  }

  const visit = (node: ts.Node): boolean => {
    return (
      (ts.isClassDeclaration(node) &&
        isAngularLifecycleClass(node, checker, decoratorNames, member)) ||
      ts.forEachChild(node, (child) => visit(child) || undefined) === true
    );
  };

  return visit(sourceFile);
};

const isAngularLifecycleClass = (
  declaration: ts.ClassDeclaration,
  checker: ts.TypeChecker,
  decoratorNames: readonly string[],
  member: PublicMember,
): boolean => {
  if (!hasAngularDecorator(declaration, checker, decoratorNames)) {
    return false;
  }

  const effectiveHook = checker.getPropertyOfType(
    checker.getTypeAtLocation(declaration),
    member.memberName,
  );
  const memberDeclarations = member.memberSymbol.declarations ?? [];

  return (
    effectiveHook?.declarations?.some(
      (hookDeclaration) =>
        memberDeclarations.includes(hookDeclaration) &&
        ts.isMethodDeclaration(hookDeclaration) &&
        hookDeclaration.body !== undefined,
    ) ?? false
  );
};

const hasAngularDecorator = (
  declaration: ts.ClassDeclaration,
  checker: ts.TypeChecker,
  decoratorNames: readonly string[],
): boolean => {
  const decorators = ts.canHaveDecorators(declaration)
    ? (ts.getDecorators(declaration) ?? [])
    : [];

  return decorators.some((decorator) => {
    const expression = decorator.expression;
    const decoratorName = ts.isCallExpression(expression)
      ? expression.expression
      : expression;

    if (!ts.isIdentifier(decoratorName)) {
      return false;
    }

    const importedName = getAngularCoreImportName(decoratorName, checker);
    return importedName !== undefined && decoratorNames.includes(importedName);
  });
};

const getAngularCoreImportName = (
  identifier: ts.Expression,
  checker: ts.TypeChecker,
): string | undefined => {
  if (!ts.isIdentifier(identifier)) {
    return undefined;
  }

  const symbol = checker.getSymbolAtLocation(identifier);
  const declarations = symbol?.declarations ?? [];
  for (const declaration of declarations) {
    if (!ts.isImportSpecifier(declaration)) {
      continue;
    }

    const importClause = declaration.parent.parent;
    if (!ts.isImportClause(importClause)) {
      continue;
    }

    const importDeclaration = importClause.parent;
    if (
      ts.isImportDeclaration(importDeclaration) &&
      ts.isStringLiteral(importDeclaration.moduleSpecifier) &&
      importDeclaration.moduleSpecifier.text === "@angular/core"
    ) {
      return declaration.propertyName?.text ?? declaration.name.text;
    }
  }

  return undefined;
};

export { angularLifecycleUsageAdapter };
