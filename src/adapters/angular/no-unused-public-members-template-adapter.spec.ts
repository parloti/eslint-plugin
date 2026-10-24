import { afterAll, describe, expect, it } from "vitest";

import { createTemporaryFixtureManager } from "../../../tests/support";
import { createFixtureLintRunner } from "../../../tests/support/no-unused-public-members-fixtures";
import { codeperfectAngularPlugin } from "./plugin";

const angularNoUnusedPublicMembersRule =
  codeperfectAngularPlugin.rules["no-unused-public-members"];

describe("Angular no-unused-public-members adapter", () => {
  const fixtureManager = createTemporaryFixtureManager();
  const runFixtureLint = createFixtureLintRunner(fixtureManager);

  afterAll(() => {
    fixtureManager.cleanupTemporaryDirectories();
  });

  it("recognizes typed template member reads and respects Angular template locals", async () => {
    // Arrange
    const run = {
      files: {
        "src/angular-core.d.ts": [
          'declare module "@angular/core" {',
          "  export function Component(metadata: { template?: string; templateUrl?: string }): ClassDecorator;",
          "}",
        ].join("\n"),
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
        "src/angular-core.d.ts": [
          'declare module "@angular/core" {',
          "  export function Component(metadata: { template?: string }): ClassDecorator;",
          "}",
        ].join("\n"),
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
        "src/angular-core.d.ts": [
          'declare module "@angular/core" {',
          "  export function Component(metadata?: { template?: string; templateUrl?: string }): ClassDecorator;",
          "}",
        ].join("\n"),
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
