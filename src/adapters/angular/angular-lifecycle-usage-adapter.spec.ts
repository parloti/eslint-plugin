import { afterAll, describe, expect, it } from "vitest";

import { createTemporaryFixtureManager } from "../../../tests/support";
import { createFixtureLintRunner } from "../../../tests/support/no-unused-public-members-fixtures";
import { codeperfectAngularPlugin } from "../../adapters";

const angularNoUnusedPublicMembersRule =
  codeperfectAngularPlugin.rules["no-unused-public-members"];
const angularCoreDeclaration = [
  'declare module "@angular/core" {',
  "  export function Component(metadata?: object): ClassDecorator;",
  "  export function Directive(metadata?: object): ClassDecorator;",
  "  export function Injectable(metadata?: object): ClassDecorator;",
  "  export function NgModule(metadata?: object): ClassDecorator;",
  "  export function Pipe(metadata?: object): ClassDecorator;",
  "}",
].join("\n");

describe("Angular lifecycle usage adapter", () => {
  const fixtureManager = createTemporaryFixtureManager();
  const runFixtureLint = createFixtureLintRunner(fixtureManager);

  afterAll(() => {
    fixtureManager.cleanupTemporaryDirectories();
  });

  it("recognizes lifecycle methods on Angular-managed classes without interfaces", async () => {
    // Arrange
    const run = {
      files: {
        "src/angular-core.d.ts": angularCoreDeclaration,
        "src/feature.ts": [
          'import { Component as NgComponent, Directive, Injectable, NgModule, Pipe } from "@angular/core";',
          "@NgComponent()",
          "export class ComponentHost {",
          "  ngAfterContentChecked() {}",
          "  ngAfterContentInit() {}",
          "  ngAfterViewChecked() {}",
          "  ngAfterViewInit() {}",
          "  ngDoCheck() {}",
          "  ngOnChanges() {}",
          "  ngOnDestroy() {}",
          "  ngOnInit() {}",
          "}",
          "@Directive()",
          "export class DirectiveHost { ngOnInit() {} }",
          "@Injectable()",
          "export class ServiceHost { ngOnDestroy() {} }",
          "@NgModule()",
          "export class ModuleHost { ngDoBootstrap() {} ngOnDestroy() {} }",
          "@Pipe()",
          "export class PipeHost { ngOnDestroy() {} }",
        ].join("\n"),
      },
      ruleModule: angularNoUnusedPublicMembersRule,
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });

  it("recognizes concrete lifecycle methods inherited by an Angular class", async () => {
    // Arrange
    const run = {
      files: {
        "src/angular-core.d.ts": angularCoreDeclaration,
        "src/feature.ts": [
          'import { Component as NgComponent } from "@angular/core";',
          "export class LifecycleBase {",
          "  ngOnInit() {}",
          "  ngOnDestroy() {}",
          "}",
          "@NgComponent()",
          "export class ComponentHost extends LifecycleBase {}",
        ].join("\n"),
      },
      ruleModule: angularNoUnusedPublicMembersRule,
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([]);
  });

  it("reports methods without a matching Angular lifecycle contract", async () => {
    // Arrange
    const run = {
      files: {
        "src/angular-core.d.ts": [
          angularCoreDeclaration,
          'declare module "@other/angular" { export function Component(): ClassDecorator; }',
        ].join("\n"),
        "src/feature.ts": [
          'import { Component as NgComponent, NgModule, Pipe } from "@angular/core";',
          'import { Component as OtherComponent } from "@other/angular";',
          'import * as ng from "@angular/core";',
          "declare function LocalComponent(): ClassDecorator;",
          "@Pipe()",
          "export class PipeInit { ngOnInit() {} }",
          "@NgModule()",
          "export class ModuleInit { ngOnInit() {} }",
          "@NgComponent()",
          "export class ComponentBootstrap { ngDoBootstrap() {} }",
          "@OtherComponent()",
          "export class OtherPackageComponent { ngOnInit() {} }",
          "@LocalComponent()",
          "export class LocalDecoratorComponent { ngOnInit() {} }",
          "@ng.Component()",
          "export class NamespaceDecoratorComponent { ngOnInit() {} }",
          "@NgComponent()",
          "export abstract class AbstractComponent { abstract ngOnInit(): void; }",
          "@NgComponent()",
          "export class PropertyHookComponent { ngOnInit = () => {}; }",
          "export interface LifecycleContract { ngOnInit(): void; }",
          "export class OrdinaryClass { ngOnInit() {} ordinaryMethod() {} }",
        ].join("\n"),
      },
      ruleModule: angularNoUnusedPublicMembersRule,
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(
      Array.from({ length: 11 }, () => "unusedPublicMember"),
    );
  });
});
