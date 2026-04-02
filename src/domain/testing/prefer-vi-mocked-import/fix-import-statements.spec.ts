import { describe, expect, it } from "vitest";

import {
  buildImportFixes,
  buildImportStatement,
} from "./fix-import-statements";

describe("prefer-vi-mocked-import fix-import-statements", () => {
  it("exports the single-match import helpers", () => {
    expect(buildImportFixes).toBeTypeOf("function");
    expect(buildImportStatement).toBeTypeOf("function");
  });

  it("inserts new imports at the top of the file when no anchor exists", () => {
    const fixes = buildImportFixes(
      {
        importPlan: {
          moduleSpecifier: "./dependencies",
          names: ["installDevelopmentDependencies"],
        },
        newline: "\n",
      } as never,
      {
        insertTextBeforeRange: (range: [number, number], text: string) => ({
          range,
          text,
          type: "before",
        }),
      } as never,
    );

    expect(fixes).toStrictEqual([
      {
        range: [0, 0],
        text: 'import { installDevelopmentDependencies } from "./dependencies";\n\n',
        type: "before",
      },
    ]);
  });

  it("inserts after an existing import anchor when one is available", () => {
    const fixes = buildImportFixes(
      {
        importPlan: {
          insert: { afterRange: [10, 20] },
          moduleSpecifier: "./dependencies",
          names: ["installDevelopmentDependencies"],
        },
        newline: "\n",
      } as never,
      {
        insertTextAfterRange: (range: [number, number], text: string) => ({
          range,
          text,
          type: "after",
        }),
      } as never,
    );

    expect(fixes).toStrictEqual([
      {
        range: [10, 20],
        text: '\nimport { installDevelopmentDependencies } from "./dependencies";',
        type: "after",
      },
    ]);
  });

  it("updates compatible imports in place", () => {
    const fixes = buildImportFixes(
      {
        importPlan: {
          moduleSpecifier: "./dependencies",
          names: ["installDevelopmentDependencies"],
          update: {
            defaultImportName: "dependencies",
            existingNamedImports: ["otherDependency"],
            range: [5, 25],
          },
        },
      } as never,
      {
        replaceTextRange: (range: [number, number], text: string) => ({
          range,
          text,
          type: "replace",
        }),
      } as never,
    );

    expect(fixes).toStrictEqual([
      {
        range: [5, 25],
        text: 'import dependencies, { installDevelopmentDependencies, otherDependency } from "./dependencies";',
        type: "replace",
      },
    ]);
  });
});
