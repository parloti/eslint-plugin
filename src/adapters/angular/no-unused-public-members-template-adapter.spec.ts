import { writeFileSync } from "node:fs";
import * as ts from "typescript";
import { afterAll, describe, expect, it } from "vitest";

import { createTemporaryFixtureManager } from "../../../tests/support";
import { createFixtureLintRunner } from "../../../tests/support/no-unused-public-members-fixtures";
import { withTemporaryProject } from "../../domain/architecture/no-unused-exports/__tests__/no-unused-exports-utilities-test-helpers";
import { createScopeLinter } from "../../domain/architecture/no-unused-public-members/__tests__";
import { codeperfectAngularPlugin } from "./plugin";

const angularNoUnusedPublicMembersRule =
  codeperfectAngularPlugin.rules["no-unused-public-members"];
const angularCoreDeclaration =
  'declare module "@angular/core" { export function Component(metadata?: { template?: string; templateUrl?: string }): ClassDecorator; }';

const withAngularRule = (
  config: ReturnType<typeof createScopeLinter>["config"],
) =>
  config.map((entry) => ({
    ...entry,
    plugins: {
      codeperfect: {
        rules: {
          ...entry.plugins.codeperfect.rules,
          "no-unused-public-members": angularNoUnusedPublicMembersRule,
        },
      },
    },
  }));

describe("Angular no-unused-public-members adapter", () => {
  const fixtureManager = createTemporaryFixtureManager();
  const runFixtureLint = createFixtureLintRunner(fixtureManager);

  afterAll(() => {
    fixtureManager.cleanupTemporaryDirectories();
  });

  it("refreshes external templates for a new checker reusing the same source snapshots", () => {
    // Arrange & Act
    const actual = withTemporaryProject(
      "angular-cache-replacement-",
      {
        "src/angular-core.d.ts": angularCoreDeclaration,
        "src/external.html": "{{ first }}",
        "src/feature.ts": [
          'import { Component } from "@angular/core";',
          '@Component({ templateUrl: "./external.html" })',
          "export class Widget { first = 1; second = 2; }",
        ].join("\n"),
        "src/index.ts": "export {};",
      },
      (root, program, resolvePath) => {
        const source = program.getSourceFile(resolvePath("src/feature.ts"));
        if (source === void 0) {
          throw new Error("Missing Angular cache fixture");
        }
        const { config, linter } = createScopeLinter(root, program);
        const angularConfig = withAngularRule(config);
        const framework = linter.verify(source.text, config, source.fileName);
        const angular = linter.verify(
          source.text,
          angularConfig,
          source.fileName,
        );
        const frameworkAgain = linter.verify(
          source.text,
          config,
          source.fileName,
        );
        writeFileSync(resolvePath("src/external.html"), "{{ second }}");
        const options = program.getCompilerOptions();
        const host = ts.createCompilerHost(options);
        const readSource = host.getSourceFile.bind(host);
        host.getCurrentDirectory = () => root;
        host.getSourceFile = (filename, ...arguments_) =>
          program.getSourceFile(filename) ??
          readSource(filename, ...arguments_);
        const next = ts.createProgram(
          program.getRootFileNames(),
          options,
          host,
        );
        const nextConfig = withAngularRule(
          createScopeLinter(root, next).config,
        );
        return {
          angular: angular.map((message) => message.message),
          framework: framework.map((message) => message.messageId),
          frameworkAgain: frameworkAgain.map((message) => message.messageId),
          next: linter
            .verify(source.text, nextConfig, source.fileName)
            .map((message) => message.message),
          reusedSource: next.getSourceFile(source.fileName) === source,
        };
      },
    );

    // Assert
    expect(actual.reusedSource).toBe(true);
    expect(actual.framework).toStrictEqual([
      "unusedPublicMember",
      "unusedPublicMember",
    ]);
    expect(actual.frameworkAgain).toStrictEqual(actual.framework);
    expect(actual.angular).toStrictEqual([expect.stringContaining("'second'")]);
    expect(actual.next).toStrictEqual([expect.stringContaining("'first'")]);
  });

  it("does not search templates belonging to a sibling API folder", async () => {
    // Arrange
    const run = {
      files: {
        "packages/a/src/feature.ts":
          "export interface Feature { siblingOnly: number }",
        "packages/a/src/index.ts": "export {};",
        "packages/b/src/angular-core.d.ts": angularCoreDeclaration,
        "packages/b/src/component.ts": [
          'import { Component } from "@angular/core";',
          'import type { Feature } from "../../a/src/feature";',
          '@Component({ template: "{{ feature.siblingOnly }}" })',
          "export class Widget { feature!: Feature; }",
        ].join("\n"),
        "packages/b/src/index.ts": "export {};",
      },
      ruleModule: angularNoUnusedPublicMembersRule,
      targetRelativePath: "packages/a/src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });

  it("recognizes typed template member reads and respects Angular template locals", async () => {
    // Arrange
    const run = {
      files: {
        "src/angular-core.d.ts": angularCoreDeclaration,
        "src/feature.ts": [
          'import { Component } from "@angular/core";',
          "interface ChartData { invalidCount: number; computedCount: number; unusedCount: number }",
          "@Component({ template: `<div>{{ chart.invalidCount }}</div><button (click)=\"handle($event.unusedCount)\"></button>@let chartAlias = chart; {{ chartAlias.invalidCount }} @let computedAlias = chartData(); {{ computedAlias.computedCount }} @let status = 'local'; {{ status }} {{ this.status }} {{ this.title }} @let localOnly = 'local'; {{ localOnly }}` })",
          "export class MarketChart {",
          "  readonly chart!: ChartData;",
          "  readonly chartData!: () => ChartData;",
          "  status = 'component';",
          "  title = 'component';",
          "  localOnly = 'component';",
          "}",
        ].join("\n"),
      },
      ruleModule: angularNoUnusedPublicMembersRule,
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([
      "unusedPublicMember",
      "unusedPublicMember",
    ]);
  });

  it("recognizes member reads in Angular control-flow blocks", async () => {
    // Arrange
    const run = {
      files: {
        "src/angular-core.d.ts": angularCoreDeclaration,
        "src/feature.ts": [
          'import { Component } from "@angular/core";',
          '@Component({ template: "' +
            [
              "@if (ifCondition; as ifAlias) { {{ ifChild }} {{ ifAlias }} }",
              "@else if (elseIfCondition) { {{ elseIfChild }} } @else { {{ elseChild }} }",
              "@for (item of items; track item.id; let index = $index) { {{ forChild }} {{ item.id }} {{ index }} }",
              "@empty { {{ emptyChild }} }",
              "@switch (switchValue) { @case (caseValue) { {{ caseChild }} } @default { {{ defaultChild }} } }",
              "<button [title]='elementInput' (click)='elementEvent($event)'>{{ elementChild }}</button>",
              "<ng-template [ngIf]='templateInput' let-item>{{ templateChild }} {{ item.id }}</ng-template>",
              "<ng-content>{{ projectionChild }}</ng-content>",
              "{{ (this.elementInput!).length }} {{ this.elementInput().length }} {{ getRow(elementInput).id }} {{ (getRow()).id }} {{ (true ? getRow : getRow)(elementInput).id }} {{ this.missing?.value }} {{ this.id }} {{ this.length }} {{ this.value }}",
              "@defer (when deferCondition; prefetch when prefetchCondition) { {{ deferChild }} }",
              "@placeholder { {{ placeholderChild }} } @loading { {{ loadingChild }} } @error { {{ errorChild }} }",
              "@boundary { {{ boundaryChild }} } @error { {{ boundaryError }} }",
              "@content(contentSlot; let contentItem) { {{ contentChild }} {{ contentItem }} }",
            ].join(" ") +
            '" })',
          "export class Blocks {",
          "  ifCondition = true; ifAlias = true; ifChild = 1; elseIfCondition = true; elseIfChild = 1; elseChild = 1;",
          "  items: Array<{ id: string }> = []; item: { id: string } = { id: 'component' }; index = 0; forChild = 1; emptyChild = 1;",
          "  switchValue = 0; caseValue = 1; caseChild = 1; defaultChild = 1;",
          "  elementInput = ''; elementEvent(_event: unknown) {} elementChild = 1;",
          "  getRow(_value?: string): { id: string } { return { id: 'row' }; } id = 1; length = 1; value = 1;",
          "  templateInput = true; templateChild = 1; projectionChild = 1;",
          "  deferCondition = true; prefetchCondition = true; deferChild = 1; placeholderChild = 1; loadingChild = 1; errorChild = 1;",
          "  boundaryChild = 1; boundaryError = 1; contentChild = 1; contentItem = 1; unused = 1;",
          "}",
        ].join("\n"),
      },
      ruleModule: angularNoUnusedPublicMembersRule,
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
    ]);
  });

  it("reads external templates and ignores templates it cannot statically parse", async () => {
    // Arrange
    const run = {
      files: {
        "src/angular-core.d.ts": angularCoreDeclaration,
        "src/external.html": "{{ rendered }}",
        "src/feature.ts": [
          'import { Component as NgComponent } from "@angular/core";',
          '@NgComponent({ templateUrl: "./external.html" })',
          "export class External { rendered = 1; unusedExternal = 1; }",
          '@NgComponent({ template: "@if (invalid) {" })',
          "export class Invalid { invalidTemplateMember = 1; }",
          '@NgComponent({ templateUrl: "./missing.html" })',
          "export class Missing { missingTemplateMember = 1; }",
          'const dynamicTemplate = "{{ dynamicTemplateMember }}";',
          "@NgComponent({ template: dynamicTemplate })",
          "export class Dynamic { dynamicTemplateMember = 1; }",
          "@NgComponent()",
          "export class NoMetadata { noMetadataMember = 1; }",
          'const templateMetadata = { template: "{{ spreadMember }}" };',
          "@NgComponent({ ...templateMetadata })",
          "export class Spread { spreadMember = 1; }",
          '@NgComponent({ ["template"]: "{{ computedMember }}" })',
          "export class Computed { computedMember = 1; }",
          '@NgComponent({ templateUrl: "." })',
          "export class Directory { directoryMember = 1; }",
          '@NgComponent({ template: "{{ anonymousUsed }}" })',
          "export default class { anonymousUsed = 1; }",
        ].join("\n"),
      },
      ruleModule: angularNoUnusedPublicMembersRule,
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual([
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
      "unusedPublicMember",
    ]);
  });

  it("ignores same-named local decorators and template string contents", async () => {
    // Arrange
    const run = {
      files: {
        "src/feature.ts": [
          "declare function Component(metadata: { template: string }): ClassDecorator;",
          `@Component({ template: "{{ unused }} {{ 'unused' }}" })`,
          "export class Widget { unused = 1; }",
        ].join("\n"),
      },
      ruleModule: angularNoUnusedPublicMembersRule,
      targetRelativePath: "src/feature.ts",
    };

    // Act
    const actualMessages = await runFixtureLint(run);

    // Assert
    expect(actualMessages).toStrictEqual(["unusedPublicMember"]);
  });
});
